// Script to check if atharv@gmail.com exists in the profiles table
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUser() {
  console.log('Checking if atharv@gmail.com exists in profiles table...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'atharv@gmail.com')
      .limit(1);

    if (error) {
      console.error('Error querying profiles table:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('User found in profiles table:');
      console.log(JSON.stringify(data[0], null, 2));
      
      // Check if user is admin
      if (data[0].role === 'admin') {
        console.log('User is already an admin.');
      } else {
        console.log('User is not an admin. Current role:', data[0].role);
      }
    } else {
      console.log('User not found in profiles table.');
      console.log('Please ensure the user has signed up through the normal signup process.');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
checkUser();