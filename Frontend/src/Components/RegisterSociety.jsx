import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Home,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { sendSocietyRegistrationRequest } from "../api/society.api";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[6-9]\d{9}$/;
const pincodePattern = /^[1-9][0-9]{5}$/;

const initialForm = {
  society_name: "",
  registration_number: "",
  total_flats: "",
  society_phone: "",
  society_email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  admin_name: "",
  admin_email: "",
  admin_phone: "",
};

const requiredFields = {
  society_name: "Society name is required.",
  registration_number: "Registration number is required.",
  total_flats: "Total flats is required.",
  address: "Society address is required.",
  city: "City is required.",
  state: "State is required.",
  pincode: "Pincode is required.",
  admin_name: "Admin name is required.",
  admin_email: "Admin email is required.",
  admin_phone: "Admin phone number is required.",
};

const trim = (value) => String(value || "").trim();

const validateRegistration = (form) => {
  const errors = {};

  Object.entries(requiredFields).forEach(([field, message]) => {
    if (!trim(form[field])) errors[field] = message;
  });

  if (trim(form.society_name) && trim(form.society_name).length < 3) {
    errors.society_name = "Society name must be at least 3 characters.";
  }

  if (
    trim(form.registration_number) &&
    (trim(form.registration_number).length < 3 ||
      trim(form.registration_number).length > 50)
  ) {
    errors.registration_number =
      "Registration number must be 3 to 50 characters.";
  }

  const flats = Number(form.total_flats);
  if (trim(form.total_flats) && (!Number.isInteger(flats) || flats < 1 || flats > 10000)) {
    errors.total_flats = "Enter a flat count between 1 and 10000.";
  }

  if (trim(form.address) && trim(form.address).length > 255) {
    errors.address = "Address must be 255 characters or fewer.";
  }

  if (trim(form.city) && trim(form.city).length > 100) {
    errors.city = "City must be 100 characters or fewer.";
  }

  if (trim(form.state) && trim(form.state).length > 100) {
    errors.state = "State must be 100 characters or fewer.";
  }

  if (trim(form.pincode) && !pincodePattern.test(trim(form.pincode))) {
    errors.pincode = "Enter a valid 6-digit pincode.";
  }

  if (trim(form.society_email) && !emailPattern.test(trim(form.society_email))) {
    errors.society_email = "Enter a valid society email address.";
  }

  if (trim(form.society_phone) && !phonePattern.test(trim(form.society_phone))) {
    errors.society_phone = "Enter a valid 10-digit Indian mobile number.";
  }

  if (trim(form.admin_name) && trim(form.admin_name).length < 3) {
    errors.admin_name = "Admin name must be at least 3 characters.";
  }

  if (trim(form.admin_email) && !emailPattern.test(trim(form.admin_email))) {
    errors.admin_email = "Enter a valid admin email address.";
  }

  if (trim(form.admin_phone) && !phonePattern.test(trim(form.admin_phone))) {
    errors.admin_phone = "Enter a valid 10-digit Indian mobile number.";
  }

  return errors;
};

const buildApiPayload = (form) => ({
  society_name: trim(form.society_name),
  registration_number: trim(form.registration_number),
  total_flats: trim(form.total_flats),
  society_phone: trim(form.society_phone),
  society_email: trim(form.society_email),
  address: trim(form.address),
  city: trim(form.city),
  state: trim(form.state),
  pincode: trim(form.pincode),
  admin_name: trim(form.admin_name),
  admin_email: trim(form.admin_email),
  admin_phone: trim(form.admin_phone),
});

function RequiredMark() {
  return <span className='text-red-600'>*</span>;
}

function FieldError({ id, children }) {
  if (!children) return null;

  return (
    <p id={id} className='mt-2 text-sm font-medium text-red-600'>
      {children}
    </p>
  );
}

function FormField({
  id,
  label,
  icon: Icon,
  required = false,
  error,
  children,
}) {
  return (
    <label htmlFor={id} className='block'>
      <span className='mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800'>
        {Icon && <Icon size={16} />}
        {label} {required && <RequiredMark />}
      </span>
      {children}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </label>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className='border-b border-slate-200 pb-4'>
      <div className='flex items-start gap-3'>
        <span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700'>
          <Icon size={20} />
        </span>
        <div>
          <h2 className='text-lg font-semibold text-slate-950'>{title}</h2>
          <p className='mt-1 text-sm leading-6 text-slate-600'>{description}</p>
        </div>
      </div>
    </div>
  );
}

function RegisterSociety() {
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState({ type: "", text: "" });

  const errors = useMemo(() => validateRegistration(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;
  const showError = (field) => (touched[field] || submitted) && errors[field];

  useEffect(() => {
    document.title = "Register New Society | Society Management";
    document
      .querySelector("meta[name='description']")
      ?.setAttribute(
        "content",
        "Submit a new society registration request for the Society Management platform."
      );
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setServerMessage({ type: "", text: "" });
  };

  const markTouched = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const inputClasses = (field) =>
    `h-11 w-full rounded-md border bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:ring-4 ${
      showError(field)
        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
        : "border-slate-300 focus:border-sky-600 focus:ring-sky-100"
    }`;

  const textAreaClasses = (field) =>
    `min-h-24 w-full resize-none rounded-md border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:ring-4 ${
      showError(field)
        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
        : "border-slate-300 focus:border-sky-600 focus:ring-sky-100"
    }`;

  const fieldProps = (field) => ({
    id: field,
    value: form[field],
    onChange: (event) => updateField(field, event.target.value),
    onBlur: () => markTouched(field),
    "aria-invalid": Boolean(showError(field)),
    "aria-describedby": showError(field) ? `${field}-error` : undefined,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (loading || hasErrors) {
      setServerMessage({
        type: "error",
        text: "Please fix the highlighted fields before sending the request.",
      });
      return;
    }

    setLoading(true);
    setServerMessage({ type: "", text: "" });

    try {
      const res = await sendSocietyRegistrationRequest(buildApiPayload(form));
      const message =
        res.data.message ||
        "Registration request sent successfully. The Super Admin will review it soon.";
      setServerMessage({ type: "success", text: message });
      toast.success(message);
      setForm(initialForm);
      setTouched({});
      setSubmitted(false);
    } catch (error) {
      const message =
        error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.message ||
        "Unable to send the registration request. Please try again.";
      setServerMessage({ type: "error", text: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className='min-h-screen bg-slate-50 text-slate-950'>
      <div className='mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 lg:px-8'>
        <header className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <Link
              to='/login'
              className='inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition hover:text-sky-800 hover:underline'>
              <ArrowLeft size={16} />
              Back to login
            </Link>
            <h1 className='mt-4 text-3xl font-semibold tracking-normal text-slate-950'>
              Register New Society
            </h1>
            <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-600'>
              Submit society and primary administrator details for Super Admin
              review. Required fields are marked with an asterisk.
            </p>
          </div>
          <div className='inline-flex w-fit items-center gap-2 rounded-md border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800'>
            <ShieldCheck size={18} />
            Secure registration request
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className='rounded-lg border border-slate-200 bg-white shadow-sm'>
          {serverMessage.text && (
            <div
              role='status'
              className={`m-5 rounded-md border px-4 py-3 text-sm font-medium ${
                serverMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}>
              <div className='flex items-start gap-2'>
                {serverMessage.type === "success" && (
                  <CheckCircle2 size={18} className='mt-0.5 shrink-0' />
                )}
                <span>{serverMessage.text}</span>
              </div>
            </div>
          )}

          <section className='space-y-5 p-5 sm:p-6'>
            <SectionHeader
              icon={Building2}
              title='Society details'
              description='Tell us about the society that needs platform access.'
            />

            <div className='grid gap-5 md:grid-cols-2'>
              <FormField
                id='society_name'
                label='Society name'
                icon={Building2}
                required
                error={showError("society_name")}>
                <input
                  {...fieldProps("society_name")}
                  className={inputClasses("society_name")}
                  placeholder='Green Heights CHS'
                />
              </FormField>

              <FormField
                id='registration_number'
                label='Registration number'
                icon={FileText}
                required
                error={showError("registration_number")}>
                <input
                  {...fieldProps("registration_number")}
                  className={inputClasses("registration_number")}
                  placeholder='MUM/CHS/12345'
                />
              </FormField>

              <FormField
                id='total_flats'
                label='Total flats'
                icon={Home}
                required
                error={showError("total_flats")}>
                <input
                  {...fieldProps("total_flats")}
                  type='number'
                  min='1'
                  max='10000'
                  inputMode='numeric'
                  className={inputClasses("total_flats")}
                  placeholder='120'
                />
              </FormField>

              <FormField
                id='society_email'
                label='Society email'
                icon={Mail}
                error={showError("society_email")}>
                <input
                  {...fieldProps("society_email")}
                  type='email'
                  autoComplete='email'
                  className={inputClasses("society_email")}
                  placeholder='office@society.com'
                />
              </FormField>

              <FormField
                id='society_phone'
                label='Society phone'
                icon={Phone}
                error={showError("society_phone")}>
                <input
                  {...fieldProps("society_phone")}
                  type='tel'
                  inputMode='numeric'
                  maxLength='10'
                  className={inputClasses("society_phone")}
                  placeholder='9876543210'
                />
              </FormField>
            </div>
          </section>

          <section className='space-y-5 border-t border-slate-200 p-5 sm:p-6'>
            <SectionHeader
              icon={MapPin}
              title='Location'
              description='Provide address details to help the Super Admin verify the request.'
            />

            <div className='grid gap-5 md:grid-cols-3'>
              <FormField
                id='city'
                label='City'
                icon={MapPin}
                required
                error={showError("city")}>
                <input
                  {...fieldProps("city")}
                  className={inputClasses("city")}
                  placeholder='Mumbai'
                />
              </FormField>

              <FormField
                id='state'
                label='State'
                icon={MapPin}
                required
                error={showError("state")}>
                <input
                  {...fieldProps("state")}
                  className={inputClasses("state")}
                  placeholder='Maharashtra'
                />
              </FormField>

              <FormField
                id='pincode'
                label='Pincode'
                icon={MapPin}
                required
                error={showError("pincode")}>
                <input
                  {...fieldProps("pincode")}
                  inputMode='numeric'
                  maxLength='6'
                  className={inputClasses("pincode")}
                  placeholder='400001'
                />
              </FormField>

              <div className='md:col-span-3'>
                <FormField
                  id='address'
                  label='Society address'
                  icon={MapPin}
                  required
                  error={showError("address")}>
                  <textarea
                    {...fieldProps("address")}
                    rows={3}
                    className={textAreaClasses("address")}
                    placeholder='Building name, street, landmark'
                  />
                </FormField>
              </div>
            </div>
          </section>

          <section className='space-y-5 border-t border-slate-200 p-5 sm:p-6'>
            <SectionHeader
              icon={UserRound}
              title='Primary administrator'
              description='This person will receive the approval update and admin access details.'
            />

            <div className='grid gap-5 md:grid-cols-2'>
              <FormField
                id='admin_name'
                label='Admin full name'
                icon={UserRound}
                required
                error={showError("admin_name")}>
                <input
                  {...fieldProps("admin_name")}
                  autoComplete='name'
                  className={inputClasses("admin_name")}
                  placeholder='Aarav Mehta'
                />
              </FormField>

              <FormField
                id='admin_email'
                label='Admin email'
                icon={Mail}
                required
                error={showError("admin_email")}>
                <input
                  {...fieldProps("admin_email")}
                  type='email'
                  autoComplete='email'
                  className={inputClasses("admin_email")}
                  placeholder='admin@society.com'
                />
              </FormField>

              <FormField
                id='admin_phone'
                label='Admin phone'
                icon={Phone}
                required
                error={showError("admin_phone")}>
                <input
                  {...fieldProps("admin_phone")}
                  type='tel'
                  inputMode='numeric'
                  maxLength='10'
                  autoComplete='tel'
                  className={inputClasses("admin_phone")}
                  placeholder='9876543210'
                />
              </FormField>
            </div>
          </section>

          <div className='flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
            <p className='text-sm leading-6 text-slate-600'>
              Already approved?{" "}
              <Link
                to='/login'
                className='font-semibold text-sky-700 transition hover:text-sky-800 hover:underline'>
                Sign in to your account
              </Link>
            </p>
            <button
              type='submit'
              disabled={loading}
              className='inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-sky-400'>
              {loading ? (
                <>
                  <Loader2 size={18} className='animate-spin' />
                  Sending request...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit registration request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default RegisterSociety;
