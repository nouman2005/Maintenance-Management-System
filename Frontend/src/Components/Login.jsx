import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../redux/slices/authSlice";
import toast from "react-hot-toast";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, token } = useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };

  /* Side effects */
  useEffect(() => {
    if (token) {
      toast.success("Login successful 🎉");
      navigate("/dashboard");
    }

    if (error) {
      toast.error(error);
    }
  }, [token, error]);

  return (
    <div className='fixed inset-0 bg-[#0f172a] flex items-center justify-center'>
      <div className='w-full max-w-sm bg-[#020617] border border-slate-800 rounded-xl shadow-xl p-6'>
        <h1 className='text-white text-center mb-4'>Maintenance System</h1>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <input
            type='email'
            placeholder='Email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='w-full h-10 px-3 bg-slate-900 text-white rounded'
          />

          <div className='relative'>
            <input
              type={showPassword ? "text" : "password"}
              placeholder='Password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full h-10 px-3 bg-slate-900 text-white rounded pr-10'
            />
            <div
              className='absolute right-3 top-2.5 cursor-pointer'
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </div>
          </div>

          <button
            disabled={loading}
            className='w-full h-10 bg-indigo-600 rounded text-white'>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
