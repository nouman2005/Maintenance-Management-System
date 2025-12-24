import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../api/auth.api";
import toast from "react-hot-toast";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈 toggle state
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) return;

    setLoading(true);

    try {
      const res = await loginAdmin({ email, password });

      if (res.data.success) {
        toast.success("Login successful 🎉");
        localStorage.setItem("token", res.data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed ❌");
      console.error(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-[#0f172a] flex items-center justify-center'>
      <div className='w-full max-w-sm bg-[#020617] border border-slate-800 rounded-xl shadow-xl p-6'>
        {/* Title */}
        <div className='text-center mb-5'>
          <h1 className='text-xl font-semibold text-white'>
            Maintenance System
          </h1>
          <p className='text-sm text-slate-400 mt-1'>Login to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-xs text-slate-400 mb-1'>Email</label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full h-10 px-3 rounded-md bg-slate-900 text-white border border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none'
              required
            />
          </div>

          <div className='relative'>
            <label className='block text-xs text-slate-400 mb-1'>
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"} // 👈 toggle type
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full h-10 px-3 rounded-md bg-slate-900 text-white border border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none pr-10'
              required
            />
            {/* Show/Hide Icon */}
            <div
              className='absolute right-3 top-[35px] cursor-pointer text-slate-400 hover:text-white'
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <AiOutlineEyeInvisible size={20} />
              ) : (
                <AiOutlineEye size={20} />
              )}
            </div>
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full h-10 rounded-md bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white disabled:opacity-60'>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className='text-center text-[11px] text-slate-500 mt-5'>
          © Nouman Ansari
        </p>
      </div>
    </div>
  );
}

export default Login;
