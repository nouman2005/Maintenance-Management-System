import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../redux/slices/authSlice";
import toast from "react-hot-toast";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, accessToken } = useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password, role }));
  };

  /* Side effects */
  useEffect(() => {
    if (accessToken) {
      toast.success("Login successful 🎉");
      navigate("/dashboard");
    }

    if (error) {
      toast.error(error);
    }
  }, [accessToken, error]);

  return (
    <div className='fixed inset-0 bg-[#0f172a] flex items-center justify-center'>
      <div className='w-full max-w-sm bg-[#020617] border border-slate-800 rounded-xl shadow-xl p-6'>
        <h1 className='text-white text-center mb-4'>Maintenance System</h1>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className='w-full h-10 px-3 bg-slate-900 text-white rounded'>
            <option value='admin'>Admin</option>
            <option value='super_admin'>Super Admin</option>
          </select>

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

        <div className='mt-4 text-center'>
          <Link to='/register-society' className='text-sm text-indigo-300'>
            Register new society
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
