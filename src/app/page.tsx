import { redirect } from 'next/navigation';

export default function Home() {
  // In a real app, you'd check for an active session.
  // For now, we'll just redirect to the login page.
  redirect('/login');
}
