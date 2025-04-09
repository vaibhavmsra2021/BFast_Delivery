-- Add shiprocket_email and shiprocket_password fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS shiprocket_email TEXT,
ADD COLUMN IF NOT EXISTS shiprocket_password TEXT;

-- Make shiprocket_api_key nullable
ALTER TABLE clients 
ALTER COLUMN shiprocket_api_key DROP NOT NULL;