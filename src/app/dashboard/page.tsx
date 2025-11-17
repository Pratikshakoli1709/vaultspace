import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // Redirect to login page
  redirect('/login');
}
