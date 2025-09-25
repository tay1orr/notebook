-- Add role tracking columns to loan_applications table
-- This allows us to track which role (admin, manager, homeroom, helper) approved or rejected each loan

-- Add approved_by_role column to track the role of the user who approved the loan
ALTER TABLE loan_applications
ADD COLUMN approved_by_role TEXT;

-- Add rejected_by_role column to track the role of the user who rejected the loan
ALTER TABLE loan_applications
ADD COLUMN rejected_by_role TEXT;

-- Add constraints to ensure role values are valid
ALTER TABLE loan_applications
ADD CONSTRAINT approved_by_role_check
CHECK (approved_by_role IN ('admin', 'manager', 'homeroom', 'helper') OR approved_by_role IS NULL);

ALTER TABLE loan_applications
ADD CONSTRAINT rejected_by_role_check
CHECK (rejected_by_role IN ('admin', 'manager', 'homeroom', 'helper') OR rejected_by_role IS NULL);

-- Add indexes for better query performance
CREATE INDEX idx_loan_applications_approved_by_role ON loan_applications(approved_by_role);
CREATE INDEX idx_loan_applications_rejected_by_role ON loan_applications(rejected_by_role);

-- Comment the columns for documentation
COMMENT ON COLUMN loan_applications.approved_by_role IS 'Role of the user who approved this loan (admin, manager, homeroom, helper)';
COMMENT ON COLUMN loan_applications.rejected_by_role IS 'Role of the user who rejected this loan (admin, manager, homeroom, helper)';