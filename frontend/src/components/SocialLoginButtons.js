import React, { useEffect, useRef, useState } from 'react';
import API from '../services/api';

const GOOGLE_CLIENT_ID = '252091835223-f4fmpr0qo4scgl7845puhb9vqp9tj5nj.apps.googleusercontent.com';  

 
const SocialLoginButtons = ({ onSuccess, onError }) => {
  const googleBtnRef = useRef(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  // ── Google ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      setGoogleReady(true);
    };

    // Chờ script load
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, []);

  const handleGoogleClick = () => {
    if (!window.google?.accounts?.id) {
      onError?.('Google SDK chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }
    // Dùng One Tap hoặc popup
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: mở popup OAuth
        window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse.access_token) {
              await sendToBackend('google', tokenResponse.access_token);
            }
          },
        }).requestAccessToken();
      }
    });
  };

  const handleGoogleCredential = async (response) => {
    // response.credential là ID token (JWT)
    // Gửi lên backend để verify
    try {
      const res = await API.post('/auth/oauth2/callback', {
        provider: 'google',
        accessToken: response.credential,
        isIdToken: true,
      });
      handleBackendResponse(res.data);
    } catch (e) {
      onError?.(e.response?.data?.error || 'Đăng nhập Google thất bại.');
    }
  };

  // ── Facebook ──────────────────────────────────────────────────────────────
  const handleFacebookLogin = () => {
    if (!window.FB) {
      onError?.('Facebook chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }
    setFbLoading(true);
    window.FB.login((response) => {
      if (response.authResponse?.accessToken) {
        sendToBackend('facebook', response.authResponse.accessToken);
      } else {
        setFbLoading(false);
        onError?.('Đăng nhập Facebook bị hủy.');
      }
    }, { scope: 'public_profile,email' });
  };

  // ── Common ────────────────────────────────────────────────────────────────
  const sendToBackend = async (provider, accessToken) => {
    try {
      const res = await API.post('/auth/oauth2/callback', { provider, accessToken });
      handleBackendResponse(res.data);
    } catch (e) {
      onError?.(e.response?.data?.error || `Đăng nhập ${provider} thất bại.`);
    } finally {
      setFbLoading(false);
    }
  };

  const handleBackendResponse = (data) => {
    if (!data?.user?.token) {
      onError?.('Phản hồi không hợp lệ từ server.');
      return;
    }
    localStorage.setItem('user', JSON.stringify(data.user));
    onSuccess?.(data.user);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.divider}>
        <span style={styles.dividerLine} />
        <span style={styles.dividerText}>hoặc</span>
        <span style={styles.dividerLine} />
      </div>

      <div style={styles.btnRow}>
        {/* Google */}
        <button style={styles.socialBtn} onClick={handleGoogleClick} type="button">
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span>Google</span>
        </button>

        {/* Facebook */}
        <button style={{ ...styles.socialBtn, ...styles.fbBtn }} onClick={handleFacebookLogin} type="button" disabled={fbLoading}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" style={{ flexShrink: 0 }}>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span>{fbLoading ? 'Đang đăng nhập...' : 'Facebook'}</span>
        </button>
      </div>
    </div>
  );
};

const styles = {
  wrap: { width: '100%', marginTop: 8 },
  divider: {
    display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 14px',
  },
  dividerLine: {
    flex: 1, height: 1, background: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, whiteSpace: 'nowrap',
  },
  btnRow: { display: 'flex', gap: 10 },
  socialBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.85rem',
    cursor: 'pointer', transition: 'background 0.2s',
  },
  fbBtn: {
    background: '#1877f2',
    border: '1px solid #1877f2',
  },
};

export default SocialLoginButtons;
