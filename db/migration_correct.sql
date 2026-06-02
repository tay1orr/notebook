-- ============================================================================
-- CORRECTED MIGRATION: drop wrong schema (from db/migrations/) then apply
-- the real production schema extracted from backup (public_schema.sql).
-- backup_schedule is appended from db/migrations/005 because it was added
-- after the 2025-05-11 backup.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop all wrongly-applied tables/functions/triggers (CASCADE)
-- ============================================================================
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.backup_history CASCADE;
DROP TABLE IF EXISTS public.backup_schedule CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;
DROP TABLE IF EXISTS public.loan_applications CASCADE;
DROP TABLE IF EXISTS public.loan_summaries_daily CASCADE;
DROP TABLE IF EXISTS public.school_calendar CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP FUNCTION IF EXISTS public.create_audit_log() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_device_status() CASCADE;
DROP FUNCTION IF EXISTS public.update_backup_schedule_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_class_id() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.check_overdue_loans() CASCADE;

-- ============================================================================
-- STEP 2: Apply real production schema (extracted from backup)
-- ============================================================================

CREATE FUNCTION public.check_overdue_loans() RETURNS void
    LANGUAGE plpgsql
    AS $$
  BEGIN
      UPDATE loan_applications
      SET status = 'overdue'
      WHERE status = 'picked_up'
      AND return_date < CURRENT_DATE;
  END;
  $$;
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
  END;
  $$;
CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.backup_history (
    id text NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    triggered_by text,
    table_name text NOT NULL,
    file_size bigint,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT backup_history_status_check CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text]))),
    CONSTRAINT backup_history_type_check CHECK ((type = ANY (ARRAY['manual'::text, 'auto'::text])))
);
CREATE TABLE public.loan_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_name text NOT NULL,
    student_no text NOT NULL,
    class_name text NOT NULL,
    email text NOT NULL,
    student_contact text,
    purpose text NOT NULL,
    purpose_detail text,
    return_date date NOT NULL,
    return_time time without time zone DEFAULT '09:00:00'::time without time zone,
    due_date timestamp without time zone,
    device_tag text,
    status text DEFAULT 'requested'::text,
    signature text,
    approved_by text,
    approved_at timestamp without time zone,
    picked_up_at timestamp without time zone,
    returned_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    approved_by_role text,
    CONSTRAINT loan_applications_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'approved'::text, 'picked_up'::text, 'returned'::text, 'overdue'::text, 'rejected'::text])))
);
CREATE VIEW public.class_loan_stats AS
 SELECT class_name,
    count(*) AS total_requests,
    count(
        CASE
            WHEN ((status = 'approved'::text) OR (status = 'picked_up'::text)) THEN 1
            ELSE NULL::integer
        END) AS approved_count,
    count(
        CASE
            WHEN (status = 'overdue'::text) THEN 1
            ELSE NULL::integer
        END) AS overdue_count
   FROM public.loan_applications
  GROUP BY class_name
  ORDER BY (count(*)) DESC;
CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grade integer NOT NULL,
    class_name text NOT NULL,
    homeroom_teacher_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE VIEW public.daily_loan_stats AS
 SELECT date(created_at) AS loan_date,
    count(*) AS total_requests,
    count(
        CASE
            WHEN ((status = 'approved'::text) OR (status = 'picked_up'::text)) THEN 1
            ELSE NULL::integer
        END) AS approved_count,
    count(
        CASE
            WHEN (status = 'rejected'::text) THEN 1
            ELSE NULL::integer
        END) AS rejected_count,
    count(
        CASE
            WHEN (status = 'returned'::text) THEN 1
            ELSE NULL::integer
        END) AS returned_count
   FROM public.loan_applications
  GROUP BY (date(created_at))
  ORDER BY (date(created_at)) DESC;
CREATE TABLE public.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_tag text NOT NULL,
    model text NOT NULL,
    serial text NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    notes text,
    assigned_class_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT devices_status_check CHECK ((status = ANY (ARRAY['available'::text, 'loaned'::text, 'maintenance'::text, 'retired'::text])))
);
CREATE VIEW public.device_loan_status AS
 SELECT d.asset_tag,
    d.model,
    d.status AS device_status,
    l.student_name,
    l.return_date,
    l.status AS loan_status
   FROM (public.devices d
     LEFT JOIN public.loan_applications l ON (((d.asset_tag = l.device_tag) AND (l.status = ANY (ARRAY['approved'::text, 'picked_up'::text])))));
CREATE TABLE public.loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    device_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    approved_by uuid,
    picked_up_at timestamp with time zone,
    due_date timestamp with time zone,
    returned_at timestamp with time zone,
    notes text,
    pickup_signature text,
    return_signature text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT loans_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'picked_up'::text, 'returned'::text, 'overdue'::text, 'cancelled'::text])))
);
CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'homeroom'::text, 'helper'::text, 'teacher'::text, 'student'::text])))
);
CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;
CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'student'::text NOT NULL,
    class_id uuid,
    student_no text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'homeroom'::text, 'helper'::text, 'teacher'::text, 'student'::text])))
);
ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.backup_history
    ADD CONSTRAINT backup_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_grade_class_name_key UNIQUE (grade, class_name);
ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_asset_tag_key UNIQUE (asset_tag);
ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_serial_key UNIQUE (serial);
ALTER TABLE ONLY public.loan_applications
    ADD CONSTRAINT loan_applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
CREATE INDEX idx_backup_history_status ON public.backup_history USING btree (status);
CREATE INDEX idx_backup_history_timestamp ON public.backup_history USING btree ("timestamp" DESC);
CREATE INDEX idx_backup_history_triggered_by ON public.backup_history USING btree (triggered_by);
CREATE INDEX idx_backup_history_type ON public.backup_history USING btree (type);
CREATE INDEX idx_devices_asset_tag ON public.devices USING btree (asset_tag);
CREATE INDEX idx_devices_status ON public.devices USING btree (status);
CREATE INDEX idx_loans_created_at ON public.loan_applications USING btree (created_at DESC);
CREATE INDEX idx_loans_device_id ON public.loans USING btree (device_id);
CREATE INDEX idx_loans_due_date ON public.loans USING btree (due_date);
CREATE INDEX idx_loans_status ON public.loans USING btree (status);
CREATE INDEX idx_loans_status_created ON public.loan_applications USING btree (status, created_at DESC);
CREATE INDEX idx_loans_student ON public.loan_applications USING btree (student_name, student_no);
CREATE INDEX idx_loans_student_id ON public.loans USING btree (student_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);
CREATE INDEX idx_users_class_id ON public.users USING btree (class_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_role ON public.users USING btree (role);
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_homeroom_teacher_id_fkey FOREIGN KEY (homeroom_teacher_id) REFERENCES auth.users(id);
ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_assigned_class_id_fkey FOREIGN KEY (assigned_class_id) REFERENCES public.classes(id);
ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE POLICY "Admin and homeroom can manage classes" ON public.classes USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'homeroom'::text]))))));
CREATE POLICY "Admin and homeroom can manage devices" ON public.devices USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'homeroom'::text]))))));
CREATE POLICY "Admin can manage all users" ON public.users USING ((EXISTS ( SELECT 1
   FROM public.users users_1
  WHERE ((users_1.id = auth.uid()) AND (users_1.role = 'admin'::text)))));
CREATE POLICY "Admin can read audit logs" ON public.audit_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));
CREATE POLICY "Everyone can read classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Everyone can read devices" ON public.devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage loans" ON public.loans USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'homeroom'::text, 'helper'::text]))))));
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Add backup_schedule (post-backup addition, from db/migrations/005)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_schedule (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'daily',
    "time" VARCHAR(5) NOT NULL DEFAULT '02:00',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Seoul',
    last_run TIMESTAMPTZ NULL,
    next_run TIMESTAMPTZ NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.backup_schedule (
    enabled, schedule_type, "time", timezone, next_run, created_by
) VALUES (
    true, 'daily', '02:00', 'Asia/Seoul',
    (NOW() + INTERVAL '1 day')::date + TIME '02:00',
    'system'
) ON CONFLICT DO NOTHING;

ALTER TABLE public.backup_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "관리자만 백업 스케줄 조회 가능" ON public.backup_schedule
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "관리자만 백업 스케줄 수정 가능" ON public.backup_schedule
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE TRIGGER update_backup_schedule_updated_at
    BEFORE UPDATE ON public.backup_schedule
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
