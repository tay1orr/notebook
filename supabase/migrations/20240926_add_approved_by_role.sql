-- Add approved_by_role column to loan_applications table
ALTER TABLE loan_applications
ADD COLUMN approved_by_role TEXT CHECK (approved_by_role IN ('admin', 'manager', 'homeroom', 'helper'));

-- Add comment for documentation
COMMENT ON COLUMN loan_applications.approved_by_role IS 'Role of the user who approved/rejected the loan application';