import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { supabase } from "../lib/supabase";

const OTP_LENGTH = 6;

export default function Verify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inputRefs = useRef([]);

  const pendingProfile = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("pendingProfile") || "{}");
    } catch {
      return {};
    }
  }, []);

  const email = (
    searchParams.get("email") ||
    pendingProfile.email ||
    ""
  ).trim().toLowerCase();

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [checkingLink, setCheckingLink] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");

  async function saveProfile(user) {
    if (!user?.id) return;

    const { error } = await supabase.from("ProfileUsers").upsert(
      {
        id: user.id,
        FirstName:
          pendingProfile.firstName || user.user_metadata?.first_name || null,
        LastName:
          pendingProfile.lastName || user.user_metadata?.last_name || null,
        Mobile: pendingProfile.mobile || user.user_metadata?.mobile || null,
        Email: user.email || pendingProfile.email || email || null,
      },
      {
        onConflict: "id",
      }
    );

    if (error) {
      throw error;
    }

    localStorage.setItem("user_id", user.id);
    localStorage.removeItem("pendingProfile");
  }

  async function finishVerifiedSession(user) {
    await saveProfile(user);
    window.history.replaceState({}, "", "/verify");
    navigate("/dashboard", { replace: true });
  }

  useEffect(() => {
    const completeLinkVerification = async () => {
      try {
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!data?.user) throw new Error("The verification link is invalid or expired.");
          await finishVerifiedSession(data.user);
          return;
        }

        if (tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type || "signup",
          });
          if (error) throw error;
          if (!data?.user) throw new Error("The verification link is invalid or expired.");
          await finishVerifiedSession(data.user);
          return;
        }

        if (!accessToken || !refreshToken) {
          setCheckingLink(false);
          return;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("Email verification session error:", error.message);
          setMessage(error.message);
          setCheckingLink(false);
          return;
        }

        const user = data?.user;

        if (!user) {
          setMessage("We could not verify your account from this link. Please try the code from your email.");
          setCheckingLink(false);
          return;
        }

        await finishVerifiedSession(user);
      } catch (err) {
        console.error("Verify flow failed:", err);
        setMessage(err.message || "Verification failed. Please try again.");
        setCheckingLink(false);
      }
    };

    completeLinkVerification();
  }, [navigate, searchParams]);

  function updateDigit(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event) {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    event.preventDefault();

    const nextOtp = Array(OTP_LENGTH)
      .fill("")
      .map((_, index) => pasted[index] || "");

    setOtp(nextOtp);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();

    const token = otp.join("");

    if (!email) {
      setMessage("Please open the verification link from the same browser or sign up again.");
      return;
    }

    if (token.length !== OTP_LENGTH) {
      setMessage("Please enter the 6-digit code from your email.");
      return;
    }

    setVerifying(true);
    setMessage("");

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) {
      setMessage(error.message);
      setVerifying(false);
      return;
    }

    try {
      await finishVerifiedSession(data?.user);
    } catch (err) {
      console.error("Profile save after OTP verification failed:", err);
      setMessage(err.message || "Email verified, but profile save failed.");
      setVerifying(false);
    }
  }

  async function handleResendOtp() {
    if (!email) {
      setMessage("Please enter your email on the signup page again.");
      return;
    }

    setResending(true);
    setMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(`Verification email sent again to ${email}.`);
    }

    setResending(false);
  }

  if (checkingLink) {
    return (
      <AuthLayout title="Verify Email" hideHeader>
        <div className="py-10 text-center">
          <p className="text-lg font-semibold text-slate-900">Verifying your email...</p>
          <p className="mt-2 text-sm text-slate-500">One moment while we finish your account.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verify Email" hideHeader>
      <form onSubmit={handleVerifyOtp} className="space-y-7 text-center">
        <div>
          <h1 className="text-3xl font-black text-slate-950">
            Hey👋, Lets make you viral🚀
          </h1>
          <h2 className="mt-8 text-3xl font-black text-slate-950">Verify Email</h2>
          <p className="mt-5 text-lg font-medium leading-8 text-slate-500">
            Verification email is sent to{" "}
            <span className="text-brand-500">{email || "your email"}</span>
            <br />
            Click the verification link, or enter the 6-digit code if your email has one.
            <br />
            (Check spam if you haven't received it)
          </p>
          {import.meta.env.VITE_USE_LOCAL_AUTH === "true" && (
            <p className="mt-3 text-sm font-semibold text-amber-700">
              Local development code: 123456
            </p>
          )}
        </div>

        <div className="flex justify-center gap-3" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                inputRefs.current[index] = node;
              }}
              aria-label={`Verification digit ${index + 1}`}
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              className="h-14 w-12 rounded-xl border border-slate-300 bg-white text-center text-2xl font-bold text-slate-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:h-16 sm:w-14"
            />
          ))}
        </div>

        {message && (
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-slate-600">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={verifying}
          className="w-full min-h-[56px] rounded-xl bg-brand-500 px-5 text-xl font-bold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {verifying ? "Verifying..." : "Verify"}
        </button>

        <button
          type="button"
          onClick={handleResendOtp}
          disabled={resending}
          className="text-lg font-semibold text-brand-500 transition hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {resending ? "Sending..." : "Resend verification email"}
        </button>

        <p className="text-lg font-medium text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-500 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
