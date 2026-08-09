import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";
import { loginUser } from "../redux/slices/authSlice";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialForm = {
  role: "super_admin",
  email: "",
  password: "",
};

const validateLogin = (form) => {
  const errors = {};
  const email = form.email.trim();

  if (!form.role) {
    errors.role = "Select the account type you want to access.";
  }

  if (!email) {
    errors.email = "Email address is required.";
  } else if (!emailPattern.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
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

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, accessToken } = useSelector((state) => state.auth);

  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const errors = useMemo(() => validateLogin(form), [form]);
  const showError = (field) => (touched[field] || submitted) && errors[field];
  const isInvalid = Object.keys(errors).length > 0;

  useEffect(() => {
    document.title = "Secure Login | Society Management";
    document
      .querySelector("meta[name='description']")
      ?.setAttribute(
        "content",
        "Secure login for the Society Management platform."
      );
  }, []);

  useEffect(() => {
    if (accessToken) {
      navigate("/dashboard");
    }
  }, [accessToken, navigate]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setServerError("");
  };

  const markTouched = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (loading || isInvalid) return;

    try {
      await dispatch(
        loginUser({
          role: form.role,
          email: form.email.trim(),
          password: form.password,
        })
      ).unwrap();
      toast.success("Login successful");
      navigate("/dashboard");
    } catch (error) {
      const message =
        error || "Unable to sign in. Check your email, password, and role.";
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <main className='min-h-screen bg-slate-50 text-slate-950'>
      <div className='mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-8'>
        <section className='hidden lg:block' aria-labelledby='login-trust-title'>
          <div className='rounded-lg border border-slate-200 bg-white p-8 shadow-sm'>
            <span className='inline-flex h-12 w-12 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm shadow-sky-200'>
              <ShieldCheck size={24} />
            </span>
            <h1
              id='login-trust-title'
              className='mt-6 text-3xl font-semibold tracking-normal text-slate-950'>
              Society operations, secured for every administrator.
            </h1>
            <p className='mt-4 text-base leading-7 text-slate-600'>
              Access resident records, maintenance workflows, and society
              controls from one reliable management workspace.
            </p>

            <div className='mt-8 grid gap-3'>
              {[
                "Role-based access for Super Admin and society admins",
                "Protected dashboard access after authentication",
                "Clean workflows for daily society management",
              ].map((item) => (
                <div
                  key={item}
                  className='flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700'>
                  <span className='h-2 w-2 rounded-full bg-sky-600' />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className='mx-auto w-full max-w-md' aria-labelledby='login-title'>
          <div className='mb-6 text-center lg:text-left'>
            <div className='mx-auto inline-flex h-12 w-12 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm shadow-sky-200 lg:mx-0'>
              <LockKeyhole size={23} />
            </div>
            <h2 id='login-title' className='mt-4 text-3xl font-semibold'>
              Sign in securely
            </h2>
            <p className='mt-2 text-sm leading-6 text-slate-600'>
              Enter your credentials to continue to the Society Management
              dashboard.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className='rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
            {serverError && (
              <div
                role='alert'
                className='mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700'>
                {serverError}
              </div>
            )}

            <div className='space-y-5'>
              <label className='block'>
                <span className='mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800'>
                  <UserRoundCog size={16} />
                  Account type <span className='text-red-600'>*</span>
                </span>
                <select
                  value={form.role}
                  onChange={(event) => updateField("role", event.target.value)}
                  onBlur={() => markTouched("role")}
                  aria-invalid={Boolean(showError("role"))}
                  aria-describedby={showError("role") ? "role-error" : undefined}
                  className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition hover:border-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100'>
                  <option value='super_admin'>Super Admin</option>
                  <option value='admin'>Admin</option>
                </select>
                <FieldError id='role-error'>{showError("role")}</FieldError>
              </label>

              <label className='block'>
                <span className='mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800'>
                  <Mail size={16} />
                  Email address <span className='text-red-600'>*</span>
                </span>
                <input
                  type='email'
                  autoComplete='email'
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  onBlur={() => markTouched("email")}
                  aria-invalid={Boolean(showError("email"))}
                  aria-describedby={
                    showError("email") ? "login-email-error" : undefined
                  }
                  className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100'
                  placeholder='name@example.com'
                />
                <FieldError id='login-email-error'>{showError("email")}</FieldError>
              </label>

              <label className='block'>
                <span className='mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800'>
                  <LockKeyhole size={16} />
                  Password <span className='text-red-600'>*</span>
                </span>
                <div className='relative'>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete='current-password'
                    value={form.password}
                    onChange={(event) =>
                      updateField("password", event.target.value)
                    }
                    onBlur={() => markTouched("password")}
                    aria-invalid={Boolean(showError("password"))}
                    aria-describedby={
                      showError("password") ? "login-password-error" : undefined
                    }
                    className='h-11 w-full rounded-md border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100'
                    placeholder='Enter your password'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword((current) => !current)}
                    className='absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800'
                    aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <FieldError id='login-password-error'>
                  {showError("password")}
                </FieldError>
              </label>

              <button
                type='submit'
                disabled={loading}
                className='inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-sky-400'>
                {loading ? (
                  <>
                    <Loader2 size={18} className='animate-spin' />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

            <p className='mt-5 text-center text-sm text-slate-600'>
              Need to onboard a new society?{" "}
              <Link
                to='/register-society'
                className='font-semibold text-sky-700 transition hover:text-sky-800 hover:underline'>
                Register new society
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

export default Login;
