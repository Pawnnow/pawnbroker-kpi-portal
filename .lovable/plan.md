
## Plan: Enable Login with Username or Email

### Overview
Currently, the login uses Supabase's built-in Auth UI which only supports email login. To allow clients to log in with either their username or email, we need to create a custom login form and a backend function that handles the username-to-email lookup.

### Why This Is Useful
Since some clients have multiple businesses requiring separate accounts, using usernames (like "store42" or "jsmith-main") is more memorable and practical than remembering different email addresses for each account.

---

### Changes Required

#### 1. Create Custom Login Form
Replace the Supabase Auth UI with a custom login form that:
- Has a single "Username or Email" input field
- Accepts either a username or email address
- Shows password reset link
- Matches the existing design

#### 2. Create Backend Function for Username Lookup
Create a new `login-with-identifier` function that:
- Accepts a username or email + password
- If the input looks like an email (contains @), use it directly
- If it's a username, look up the email from the `profiles` table
- Return appropriate error messages without revealing if users exist

#### 3. Update Auth Page
Replace the current Auth page to use the new custom form

---

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/login-with-identifier/index.ts` | Create | New function to handle username/email lookup and authentication |
| `src/pages/Auth.tsx` | Modify | Replace Supabase Auth UI with custom login form |

---

### Technical Details

#### Backend Function Logic

```text
User enters "identifier" (username or email) + password
                    |
                    v
        Does identifier contain "@"?
           /                 \
         Yes                  No
          |                    |
    Use as email      Look up email from
          |           profiles.user_name
          |                    |
          v                    v
        Sign in with supabase.auth.signInWithPassword()
```

#### Security Considerations
- The function will use the service role key to look up usernames securely
- Error messages will be generic ("Invalid credentials") to prevent username enumeration
- RLS policies already prevent anonymous access to profiles table, so the lookup must happen server-side

#### Custom Login Form Features
- Single input for username or email
- Password field with show/hide toggle
- "Forgot Password?" link (email required for password reset)
- Loading state during authentication
- Error handling with toast notifications
