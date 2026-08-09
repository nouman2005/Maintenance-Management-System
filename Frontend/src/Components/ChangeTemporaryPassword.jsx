import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useDispatch } from "react-redux";
import { changePassword } from "../api/auth.api";
import { updateUser } from "../redux/slices/authSlice";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const initialForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const validateForm = (form) => {
  const errors = {};

  if (!form.current_password) {
    errors.current_password = "Temporary password is required.";
  }

  if (!form.new_password) {
    errors.new_password = "New password is required.";
  } else if (!passwordPattern.test(form.new_password)) {
    errors.new_password =
      "Use 8+ characters with uppercase, lowercase, number, and symbol.";
  } else if (form.new_password === form.current_password) {
    errors.new_password =
      "New password must be different from the temporary password.";
  }

  if (!form.confirm_password) {
    errors.confirm_password = "Confirm your new password.";
  } else if (form.confirm_password !== form.new_password) {
    errors.confirm_password = "Passwords do not match.";
  }

  return errors;
};

function FieldError({ id, children }) {
  if (!children) return null;

  return (
    <p id={id} className='mt-2 text-sm font-medium text-red-600'>
      {children}
    </p>
  );
}

function ChangeTemporaryPassword() {
  const dispatch = useDispatch();
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });

  const errors = useMemo(() => validateForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;
  const showError = (field) => (touched[field] || submitted) && errors[field];

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
  };

  const inputClasses = (field) =>
    `h-11 w-full rounded-md border bg-white px-3 pr-11 text-sm text-slate-950 outline-none transition hover:border-slate-400 focus:ring-4 ${
      showError(field)
        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
        : "border-slate-300 focus:border-sky-600 focus:ring-sky-100"
    }`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (loading || hasErrors) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      dispatch(updateUser({ must_change_password: false }));
      toast.success(res.data.message || "Password changed successfully");
    } catch (error) {
      const errorMessage =
        error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.message ||
        "Unable to change password. Please try again.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const passwordFields = [
    {
      id: "current_password",
      label: "Temporary password",
      autoComplete: "current-password",
    },
    {
      id: "new_password",
      label: "New password",
      autoComplete: "new-password",
    },
    {
      id: "confirm_password",
      label: "Confirm new password",
      autoComplete: "new-password",
    },
  ];

  return (
    <main className='flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-8 text-slate-950'>
      <section className='w-full max-w-md' aria-labelledby='change-password-title'>
        <div className='mb-6 text-center'>
          <div className='mx-auto inline-flex h-12 w-12 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm shadow-sky-200'>
            <ShieldCheck size={24} />
          </div>
          <h1
            id='change-password-title'
            className='mt-4 text-3xl font-semibold tracking-normal'>
            Set your new password
          </h1>
          <p className='mt-2 text-sm leading-6 text-slate-600'>
            Your account was created with temporary approval credentials. Choose
            a secure password before continuing.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
          {message && (
            <div
              role='alert'
              className='mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700'>
              {message}
            </div>
          )}

          <div className='space-y-5'>
            {passwordFields.map((field) => (
              <label key={field.id} htmlFor={field.id} className='block'>
                <span className='mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800'>
                  <LockKeyhole size={16} />
                  {field.label} <span className='text-red-600'>*</span>
                </span>
                <div className='relative'>
                  <input
                    id={field.id}
                    type={visible[field.id] ? "text" : "password"}
                    autoComplete={field.autoComplete}
                    value={form[field.id]}
                    onChange={(event) => updateField(field.id, event.target.value)}
                    onBlur={() =>
                      setTouched((current) => ({ ...current, [field.id]: true }))
                    }
                    aria-invalid={Boolean(showError(field.id))}
                    aria-describedby={
                      showError(field.id) ? `${field.id}-error` : undefined
                    }
                    className={inputClasses(field.id)}
                  />
                  <button
                    type='button'
                    onClick={() =>
                      setVisible((current) => ({
                        ...current,
                        [field.id]: !current[field.id],
                      }))
                    }
                    className='absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800'
                    aria-label={
                      visible[field.id]
                        ? `Hide ${field.label.toLowerCase()}`
                        : `Show ${field.label.toLowerCase()}`
                    }>
                    {visible[field.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <FieldError id={`${field.id}-error`}>
                  {showError(field.id)}
                </FieldError>
              </label>
            ))}

            <button
              type='submit'
              disabled={loading}
              className='inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-sky-400'>
              {loading ? (
                <>
                  <Loader2 size={18} className='animate-spin' />
                  Updating password...
                </>
              ) : (
                "Change password and continue"
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default ChangeTemporaryPassword;
