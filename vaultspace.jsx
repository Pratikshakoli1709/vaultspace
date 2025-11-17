import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  RiDeleteBinLine,
  RiEdit2Line,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiKey2Line,
  RiLogoutCircleRLine,
  RiRefreshLine,
  RiShieldKeyholeLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co'; // TODO: replace with your Supabase project URL
const SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_KEY'; // TODO: replace with your Supabase anon key

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true },
  realtime: { params: { eventsPerSecond: 10 } },
});

/** @type {ReadonlyArray<{ value: string; label: string }>} */
const ITEM_TYPES = [
  { value: 'secret', label: 'Secret' },
  { value: 'credential', label: 'Credential' },
  { value: 'document', label: 'Document' },
  { value: 'link', label: 'Link' },
];

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} email
 * @property {string|null} full_name
 * @property {'admin'|'user'} role
 */

/**
 * @typedef {Object} DataItem
 * @property {string} id
 * @property {string} owner_id
 * @property {string} title
 * @property {string|null} description
 * @property {string} item_type
 * @property {string|null} secret_value
 * @property {string|null} file_path
 * @property {string[]|null} tags
 * @property {Record<string, unknown>|null} metadata
 * @property {boolean} is_sensitive
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} ActivityLog
 * @property {string} id
 * @property {string} actor_id
 * @property {string|null} data_item_id
 * @property {string} action
 * @property {Record<string, unknown>|null} details
 * @property {string} created_at
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} recipient_id
 * @property {string|null} data_item_id
 * @property {string} notification_type
 * @property {Record<string, unknown>|null} payload
 * @property {boolean} is_read
 * @property {string} created_at
 */

/**
 * @typedef {Object} ItemFormState
 * @property {string} title
 * @property {string} description
 * @property {string} itemType
 * @property {string} secretValue
 * @property {string} tags
 * @property {boolean} isSensitive
 * @property {File|null} file
 */

/** @type {ItemFormState} */
const INITIAL_ITEM_FORM = {
  title: '',
  description: '',
  itemType: 'secret',
  secretValue: '',
  tags: '',
  isSensitive: false,
  file: null,
};

/**
 * @param {string} value
 * @returns {string}
 */
const formatDateTime = (value) => {
  const date = new Date(value);
  return date.toLocaleString();
};

/**
 * @param {string} context
 * @param {unknown} error
 */
const logClientError = (context, error) => {
  console.error(`[VaultSpace][${context}]`, error);
};

const VaultSpaceApp = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [authMessage, setAuthMessage] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingItem, setSubmittingItem] = useState(false);
  const [itemForm, setItemForm] = useState({ ...INITIAL_ITEM_FORM });
  const [editingItemId, setEditingItemId] = useState(null);
  const [visibleSecrets, setVisibleSecrets] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  const isAdmin = useMemo(() => profile?.role === 'admin', [profile]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        if (!isMounted) {
          return;
        }
        setSession(data.session);
        if (data.session?.user) {
          await hydrateProfile(data.session.user.id);
        }
      } catch (error) {
        logClientError('initAuth', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        void hydrateProfile(newSession.user.id);
      } else {
        setProfile(null);
        setItems([]);
        setActivityLogs([]);
        setNotifications([]);
      }
    });

    void initAuth();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const hydrateProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data);
        await Promise.all([fetchDataItems(data.role === 'admin'), fetchActivityLogs(data.role === 'admin'), fetchNotifications(data.role === 'admin')]);
      }
    } catch (error) {
      logClientError('hydrateProfile', error);
    }
  }, []);

  const fetchDataItems = useCallback(
    async (asAdmin) => {
      if (!session?.user) {
        return;
      }
      try {
        setRefreshing(true);
        const query = supabase.from('data_items').select('*').order('updated_at', { ascending: false });

        if (!asAdmin) {
          query.eq('owner_id', session.user.id);
        }

        const { data, error } = await query;
        if (error) {
          throw error;
        }
        setItems(data);
      } catch (error) {
        logClientError('fetchDataItems', error);
      } finally {
        setRefreshing(false);
      }
    },
    [session?.user],
  );

  const fetchActivityLogs = useCallback(
    async (asAdmin) => {
      if (!session?.user) {
        return;
      }
      try {
        const query = supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!asAdmin) {
          query.or(
            [
              `actor_id.eq.${session.user.id}`,
              `data_item_id.in.(${items
                .map((item) => item.id)
                .join(',') || 'null'})`,
            ].join(','),
          );
        }

        const { data, error } = await query;
        if (error) {
          throw error;
        }
        setActivityLogs(data ?? []);
      } catch (error) {
        logClientError('fetchActivityLogs', error);
      }
    },
    [items, session?.user],
  );

  const fetchNotifications = useCallback(
    async (asAdmin) => {
      if (!session?.user) {
        return;
      }
      try {
        const query = supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!asAdmin) {
          query.eq('recipient_id', session.user.id);
        }

        const { data, error } = await query;
        if (error) {
          throw error;
        }
        setNotifications(data ?? []);
      } catch (error) {
        logClientError('fetchNotifications', error);
      }
    },
    [session?.user],
  );

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const dataChannel = supabase
      .channel('vaultspace-data')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'data_items' },
        () => {
          void fetchDataItems(isAdmin);
        },
      )
      .subscribe();

    const logsChannel = supabase
      .channel('vaultspace-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          setActivityLogs((prev) => {
            const next = [payload.new, ...prev];
            return next.slice(0, 100);
          });
        },
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel('vaultspace-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          void fetchNotifications(isAdmin);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(dataChannel);
      void supabase.removeChannel(logsChannel);
      void supabase.removeChannel(notificationsChannel);
    };
  }, [session?.user, fetchDataItems, fetchNotifications, isAdmin]);

  const handleSignup = useCallback(
    async (event) => {
      event.preventDefault();
      setAuthError(null);
      setAuthMessage(null);

      if (!signupEmail || !signupPassword || !signupFullName) {
        setAuthError('Full name, email, and password are required to sign up.');
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: signupEmail.trim(),
          password: signupPassword,
          options: {
            data: {
              full_name: signupFullName.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setAuthMessage('Check your email for the confirmation link to finish signing up.');
        } else {
          setAuthMessage('Sign-up successful.');
        }
        setSignupFullName('');
        setSignupEmail('');
        setSignupPassword('');
      } catch (error) {
        logClientError('handleSignup', error);
        setAuthError(error instanceof Error ? error.message : 'Unable to sign up right now.');
      }
    },
    [signupEmail, signupPassword, signupFullName],
  );

  const handleSignin = useCallback(
    async (event) => {
      event.preventDefault();
      setAuthError(null);
      setAuthMessage(null);

      if (!signinEmail || !signinPassword) {
        setAuthError('Email and password are required to sign in.');
        return;
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: signinEmail.trim(),
          password: signinPassword,
        });

        if (error) {
          throw error;
        }

        setSession(data.session);
        setSigninEmail('');
        setSigninPassword('');
      } catch (error) {
        logClientError('handleSignin', error);
        setAuthError(error instanceof Error ? error.message : 'Unable to sign in right now.');
      }
    },
    [signinEmail, signinPassword],
  );

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logClientError('handleSignOut', error);
    }
  }, []);

  const upsertActivityLog = useCallback(
    async (action, dataItemId, details) => {
      if (!session?.user) {
        return;
      }
      try {
        const payload = {
          actor_id: session.user.id,
          data_item_id: dataItemId,
          action,
          details: details ?? {},
          user_agent: navigator.userAgent ?? null,
        };
        const { error } = await supabase.from('activity_logs').insert(payload);
        if (error) {
          throw error;
        }
      } catch (error) {
        logClientError('upsertActivityLog', error);
      }
    },
    [session?.user],
  );

  const uploadToStorage = useCallback(
    async (file) => {
      if (!session?.user) {
        return null;
      }
      try {
        const bucket = 'vaultspace-assets';
        const extension = file.name.split('.').pop() ?? 'bin';
        const key = `${session.user.id}/${crypto.randomUUID?.() ?? Date.now().toString()}.${extension}`;

        const { error: uploadError } = await supabase.storage.from(bucket).upload(key, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

        if (uploadError) {
          throw uploadError;
        }

        return key;
      } catch (error) {
        logClientError('uploadToStorage', error);
        return null;
      }
    },
    [session?.user],
  );

  const resetItemForm = useCallback(() => {
    setItemForm({ ...INITIAL_ITEM_FORM });
    setEditingItemId(null);
  }, []);

  const handleCreateOrUpdateItem = useCallback(
    async (event) => {
      event.preventDefault();
      if (!session?.user) {
        return;
      }

      if (!itemForm.title.trim()) {
        alert('Title is required.');
        return;
      }

      setSubmittingItem(true);

      try {
        let filePath = null;
        if (itemForm.file) {
          filePath = await uploadToStorage(itemForm.file);
        }

        const payload = {
          title: itemForm.title.trim(),
          description: itemForm.description.trim() || null,
          item_type: itemForm.itemType,
          secret_value: itemForm.secretValue || null,
          tags:
            itemForm.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean) ?? [],
          is_sensitive: itemForm.isSensitive,
          metadata: {},
          owner_id: session.user.id,
        };

        if (filePath) {
          payload.file_path = filePath;
        }

        if (editingItemId) {
          const { error } = await supabase
            .from('data_items')
            .update(payload)
            .eq('id', editingItemId)
            .select('id')
            .maybeSingle();

          if (error) {
            throw error;
          }
          await upsertActivityLog('updated', editingItemId, { title: payload.title });
        } else {
          const { data, error } = await supabase.from('data_items').insert(payload).select('id').maybeSingle();
          if (error) {
            throw error;
          }
          if (data?.id) {
            await upsertActivityLog('created', data.id, { title: payload.title });
          }
        }

        await fetchDataItems(isAdmin);
        resetItemForm();
      } catch (error) {
        logClientError('handleCreateOrUpdateItem', error);
        alert(error instanceof Error ? error.message : 'Unable to save item.');
      } finally {
        setSubmittingItem(false);
      }
    },
    [
      editingItemId,
      fetchDataItems,
      isAdmin,
      itemForm.description,
      itemForm.file,
      itemForm.isSensitive,
      itemForm.itemType,
      itemForm.secretValue,
      itemForm.tags,
      itemForm.title,
      resetItemForm,
      session?.user,
      uploadToStorage,
      upsertActivityLog,
    ],
  );

  const handleEditItem = useCallback((item) => {
    setEditingItemId(item.id);
    setItemForm({
      title: item.title,
      description: item.description ?? '',
      itemType: item.item_type,
      secretValue: item.secret_value ?? '',
      tags: (item.tags ?? []).join(', '),
      isSensitive: item.is_sensitive,
      file: null,
    });
  }, []);

  const handleDeleteItem = useCallback(
    async (item) => {
      if (!window.confirm(`Delete ${item.title}? This cannot be undone.`)) {
        return;
      }
      try {
        const { error } = await supabase.from('data_items').delete().eq('id', item.id);
        if (error) {
          throw error;
        }
        await upsertActivityLog('deleted', item.id, { title: item.title });
        await fetchDataItems(isAdmin);
      } catch (error) {
        logClientError('handleDeleteItem', error);
        alert(error instanceof Error ? error.message : 'Unable to delete item.');
      }
    },
    [fetchDataItems, isAdmin, upsertActivityLog],
  );

  const toggleSecretVisibility = useCallback(
    async (item) => {
      const currentlyVisible = visibleSecrets[item.id] ?? false;
      const next = !currentlyVisible;
      setVisibleSecrets((prev) => ({ ...prev, [item.id]: next }));
      if (next) {
        await upsertActivityLog('viewed', item.id, { title: item.title });
      }
    },
    [upsertActivityLog, visibleSecrets],
  );

  const handleCopySecret = useCallback(
    async (item) => {
      if (!item.secret_value) {
        alert('No secret value stored for this item.');
        return;
      }
      try {
        await navigator.clipboard.writeText(item.secret_value);
        await upsertActivityLog('copied', item.id, { title: item.title });
        alert('Secret copied to clipboard.');
      } catch (error) {
        logClientError('handleCopySecret', error);
        alert('Unable to copy secret to clipboard.');
      }
    },
    [upsertActivityLog],
  );

  const renderAuthForms = () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4 py-12 text-slate-50">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/60 p-10 shadow-2xl shadow-slate-900/80 backdrop-blur">
        <div className="mb-10 flex flex-col gap-2 text-center">
          <div className="inline-flex items-center justify-center gap-2 text-slate-300">
            <RiShieldKeyholeLine className="text-3xl text-cyan-400" />
            <span className="text-lg uppercase tracking-[0.4em] text-slate-500">VaultSpace</span>
          </div>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Secure Credential Vault</h1>
          <p className="text-sm text-slate-400 md:text-base">
            A zero-trust workspace for storing deployment keys, documents, and environment secrets. Join your team securely with Supabase authentication, granular RLS, and realtime auditing.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <form onSubmit={handleSignin} className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-900/60">
            <h2 className="text-xl font-semibold text-white">Sign in</h2>
            <div>
              <label htmlFor="signin-email" className="mb-2 block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="signin-email"
                type="email"
                required
                value={signinEmail}
                onChange={(event) => setSigninEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="signin-password" className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="signin-password"
                type="password"
                required
                value={signinPassword}
                onChange={(event) => setSigninPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Sign in
              <RiKey2Line className="text-lg" />
            </button>
          </form>
          <form onSubmit={handleSignup} className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-900/60">
            <h2 className="text-xl font-semibold text-white">Create account</h2>
            <div>
              <label htmlFor="signup-full-name" className="mb-2 block text-sm font-medium text-slate-300">
                Full name
              </label>
              <input
                id="signup-full-name"
                type="text"
                required
                value={signupFullName}
                onChange={(event) => setSignupFullName(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
                placeholder="Ada Lovelace"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/60 bg-transparent px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Request access
              <RiShieldKeyholeLine className="text-lg" />
            </button>
          </form>
        </div>
        {authError && (
          <p className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-center text-sm text-red-200">
            {authError}
          </p>
        )}
        {authMessage && (
          <p className="mt-8 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-4 text-center text-sm text-cyan-200">
            {authMessage}
          </p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-slate-300 shadow-lg">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          Initializing VaultSpace...
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return renderAuthForms();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.4em] text-slate-500">
              <RiShieldKeyholeLine className="text-lg text-cyan-400" />
              VaultSpace
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-white">Secure Workspace</h1>
            <p className="text-sm text-slate-400">Realtime credential storage with Supabase RLS and audit logging.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-white">{profile.full_name ?? profile.email}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">Role: {profile.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-red-400 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Logout
              <RiLogoutCircleRLine className="text-base" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/40">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">{editingItemId ? 'Update Item' : 'Create Secure Item'}</h2>
                <p className="text-sm text-slate-400">
                  Store API tokens, deployment keys, links, and encrypted documents in the vault. Files upload to the `vaultspace-assets` bucket.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await Promise.all([fetchDataItems(isAdmin), fetchActivityLogs(isAdmin), fetchNotifications(isAdmin)]);
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Refresh
                <RiRefreshLine className="text-sm" />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateItem} className="grid gap-4 sm:grid-cols-2 sm:gap-6">
              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-medium text-slate-300">Title</label>
                <input
                  type="text"
                  required
                  value={itemForm.title}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
                  placeholder="Production API Token"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-medium text-slate-300">Type</label>
                <select
                  value={itemForm.itemType}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, itemType: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
                >
                  {ITEM_TYPES.map((itemType) => (
                    <option key={itemType.value} value={itemType.value}>
                      {itemType.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
                  placeholder="Deployment key for VaultSpace production cluster."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">Secret value</label>
                <textarea
                  value={itemForm.secretValue}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, secretValue: event.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
                  placeholder="-----BEGIN PRIVATE KEY-----"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Stored in the `secret_value` column. Revoke credentials immediately if a copy/view action looks suspicious.
                </p>
              </div>
              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-medium text-slate-300">Tags</label>
                <input
                  type="text"
                  value={itemForm.tags}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, tags: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
                  placeholder="prod, api, backend"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-1">
                <input
                  id="is-sensitive"
                  type="checkbox"
                  checked={itemForm.isSensitive}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, isSensitive: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="is-sensitive" className="text-sm text-slate-300">
                  Mark as sensitive (audit on view/copy)
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">Attachment</label>
                <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
                  <input
                    type="file"
                    accept="*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setItemForm((prev) => ({ ...prev, file: file ?? null }));
                    }}
                    className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-400"
                  />
                  <p className="text-xs text-slate-500">
                    Files upload to Supabase Storage bucket <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300">vaultspace-assets</code>. Ensure the bucket exists and RLS allows authenticated writes.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={submittingItem}
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RiUploadCloud2Line className="text-lg" />
                  {editingItemId ? 'Save changes' : 'Create item'}
                </button>
                {editingItemId && (
                  <button
                    type="button"
                    onClick={resetItemForm}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-950/30">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Vault items</h2>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {isAdmin ? 'All team items (admin visibility)' : 'Items you own'}
                </p>
              </div>
              {refreshing && <span className="text-xs text-slate-400">Refreshing…</span>}
            </div>
            {items.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-400">
                No secure items yet. Use the form above to create your first credential.
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {items.map((item) => {
                  const showSecret = visibleSecrets[item.id] ?? false;
                  return (
                    <li key={item.id} className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                            {item.item_type}
                          </span>
                          <span className="text-sm text-slate-500">Updated {formatDateTime(item.updated_at)}</span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                        {item.description && <p className="mt-1 text-sm text-slate-400">{item.description}</p>}
                        {item.tags?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-400">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleSecretVisibility(item)}
                            className="flex w-fit items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                          >
                            {showSecret ? <RiEyeOffLine className="text-sm" /> : <RiEyeLine className="text-sm" />}
                            {showSecret ? 'Hide secret' : 'Reveal secret'}
                          </button>
                          {showSecret && (
                            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-sm font-mono text-cyan-100">
                              <pre className="whitespace-pre-wrap break-all text-[13px] leading-relaxed">{item.secret_value ?? '—'}</pre>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => void handleCopySecret(item)}
                              className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                              <RiFileCopyLine className="text-sm" />
                              Copy secret
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditItem(item)}
                              className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 font-semibold text-slate-300 transition hover:border-amber-400 hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                              <RiEdit2Line className="text-sm" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteItem(item)}
                              className="flex items-center gap-1 rounded-lg border border-red-500/40 px-3 py-1.5 font-semibold text-red-200 transition hover:border-red-400 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                              <RiDeleteBinLine className="text-sm" />
                              Delete
                            </button>
                          </div>
                        </div>
                        {item.file_path && (
                          <p className="mt-2 text-xs text-slate-500">
                            Attachment path:
                            <code className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">{item.file_path}</code>
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 md:text-right">
                        <p>Created {formatDateTime(item.created_at)}</p>
                        <p>Owner: {item.owner_id === profile.id ? 'You' : item.owner_id}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-950/40">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Realtime activity</h2>
              <p className="text-xs text-slate-500">Last 100 actions captured across the vault.</p>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {activityLogs.length === 0 ? (
                <div className="px-6 py-6 text-sm text-slate-400">No activity recorded yet.</div>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {activityLogs.map((log) => (
                    <li key={log.id} className="px-6 py-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-500">{formatDateTime(log.created_at)}</span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-400">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-950/40">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
              <p className="text-xs text-slate-500">Key rotation alerts and admin broadcasts.</p>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-6 py-6 text-sm text-slate-400">No notifications available.</div>
              ) : (
                <ul className="divide-y divide-slate-800 text-sm">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                          {notification.notification_type}
                        </span>
                        <span className="text-xs text-slate-500">{formatDateTime(notification.created_at)}</span>
                      </div>
                      {notification.payload && Object.keys(notification.payload).length > 0 ? (
                        <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-400">
                          {JSON.stringify(notification.payload, null, 2)}
                        </pre>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">No additional details provided.</p>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        Item reference: {notification.data_item_id ?? 'N/A'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Supabase + Tailwind + React · Secure by design with RLS.</p>
          <p>Bucket required: <code className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-cyan-300">vaultspace-assets</code></p>
        </div>
      </footer>
    </div>
  );
};

export default VaultSpaceApp;

