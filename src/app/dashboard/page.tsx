import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // Redirect to the root which is now the main dashboard preview.
  redirect('/');
}
