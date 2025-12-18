-- Add email column to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN email TEXT;

-- Update existing rows with emails from auth.users
UPDATE public.user_roles ur
SET email = au.email
FROM auth.users au
WHERE ur.user_id = au.id;

-- Make email column NOT NULL after populating it
ALTER TABLE public.user_roles 
ALTER COLUMN email SET NOT NULL;

-- Add index on email for better query performance
CREATE INDEX idx_user_roles_email ON public.user_roles(email);