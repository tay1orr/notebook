-- Add rejected_by field to loan_applications table
-- This allows us to track who rejected each loan (similar to approved_by)

-- Add rejected_by column to track the user who rejected the loan
ALTER TABLE loan_applications
ADD COLUMN rejected_by TEXT;

-- Add rejected_at column to track when the loan was rejected
ALTER TABLE loan_applications
ADD COLUMN rejected_at TIMESTAMPTZ;

-- Add index for better query performance
CREATE INDEX idx_loan_applications_rejected_by ON loan_applications(rejected_by);
CREATE INDEX idx_loan_applications_rejected_at ON loan_applications(rejected_at);

-- Comment the columns for documentation
COMMENT ON COLUMN loan_applications.rejected_by IS 'Email of the user who rejected this loan';
COMMENT ON COLUMN loan_applications.rejected_at IS 'Timestamp when this loan was rejected';