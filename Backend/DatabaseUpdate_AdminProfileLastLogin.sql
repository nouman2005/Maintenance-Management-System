-- Adds previous-login tracking used by the Admin profile sidebar.

ALTER TABLE super_admins
  ADD COLUMN previous_login_at TIMESTAMP NULL AFTER refresh_token;

ALTER TABLE admins
  ADD COLUMN previous_login_at TIMESTAMP NULL AFTER refresh_token;
