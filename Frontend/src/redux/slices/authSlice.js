import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginAdmin } from "../../api/auth.api";

export const loginUser = createAsyncThunk(
  "auth/login",
  async (data, { rejectWithValue }) => {
    try {
      const res = await loginAdmin(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: JSON.parse(localStorage.getItem("user")) || null,
    accessToken: localStorage.getItem("accessToken") || null,
    refreshToken: localStorage.getItem("refreshToken") || null,
    loading: false,
    error: null,
  },

  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.clear();
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.tokens?.accessToken;
        state.refreshToken = action.payload.tokens?.refreshToken;

        localStorage.setItem("user", JSON.stringify(action.payload.user));
        localStorage.setItem("accessToken", action.payload.tokens?.accessToken);
        localStorage.setItem(
          "refreshToken",
          action.payload.tokens?.refreshToken
        );
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
