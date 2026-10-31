import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import logoUrl from "../assets/justdms-logo.png";
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
      setMessage(`Please enter the ${OTP_LENGTH}-digit code from your email.`);
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
      <AuthLayout title="Verify your email" hideHeader compact>
        <div className="py-10 text-center" role="status">
          <LoaderCircle className="mx-auto mb-5 h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Verifying your email</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">One moment while we finish setting up your account.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verify your email" hideHeader compact>
      <form onSubmit={handleVerifyOtp} className="text-center">
        <Link to="/" aria-label="JustDMs home" className="mb-5 inline-flex items-center justify-center gap-2.5">
          <img src={logoUrl} alt="" className="h-10 w-10 rounded-xl object-contain" />
          <span className="text-xl font-bold tracking-tight text-slate-950">JustDMs</span>
        </Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">One last step</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950 sm:text-3xl">Check your inbox</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">We sent a verification email to</p>
        <p className="mt-1 break-all text-sm font-semibold text-slate-900">{email || "your email address"}</p>
        <p id="verification-help" className="mx-auto mt-4 max-w-xs text-sm leading-6 text-slate-500">
          Open the link in your email, or enter the {OTP_LENGTH}-digit code below.
        </p>

        {import.meta.env.VITE_USE_LOCAL_AUTH === "true" && (
          <p className="mt-3 text-xs font-semibold text-amber-700">Local development code: 123456</p>
        )}

        <fieldset className="mt-5" disabled={verifying}>
          <legend className="sr-only">Six-digit verification code</legend>
          <div
            className="mx-auto grid w-full max-w-sm gap-2 sm:gap-2.5"
            style={{ gridTemplateColumns: `repeat(${OTP_LENGTH}, minmax(0, 1fr))` }}
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(node) => { inputRefs.current[index] = node; }}
                aria-label={`Verification digit ${index + 1}`}
                aria-describedby="verification-help"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                className={`h-14 min-w-0 w-full rounded-xl border text-center text-2xl font-semibold text-slate-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:opacity-60 ${digit ? "border-brand-200 bg-brand-50/50" : "border-slate-200 bg-slate-50/70 hover:border-slate-300"}`}
              />
            ))}
          </div>
        </fieldset>

        {message && (
          <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-slate-700">{message}</p>
        )}

        <button
          type="submit"
          disabled={verifying}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {verifying ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {verifying ? "Verifying..." : "Verify email"}
          {!verifying && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>

        <div className="mt-5 text-sm leading-6">
          <p className="text-slate-500">Didn’t get the email? Check your spam folder.</p>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resending || verifying}
            className="mt-1 rounded font-semibold text-brand-600 transition hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {resending ? "Sending email..." : "Resend verification email"}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Keep your verification code private.</span>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Already verified? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
