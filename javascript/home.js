// javascript/home.js - WithSecurity Home Application Logic & Database Engine
const { useState, useEffect } = React;

// 1. IndexedDB Persistent Database Manager
const DB_NAME = 'WithSecurity_Home_DB';
const DB_VERSION = 1;

function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('checklists')) {
        db.createObjectStore('checklists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('vault')) {
        db.createObjectStore('vault', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('otp')) {
        db.createObjectStore('otp', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('incidents')) {
        db.createObjectStore('incidents', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveToDB(storeName, item) {
  try {
    const db = await initIndexedDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
  } catch (err) {
    console.error(`DB Save Error [${storeName}]:`, err);
  }
}

async function loadFromDB(storeName) {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error(`DB Load Error [${storeName}]:`, err);
    return [];
  }
}

// 2. Main Home React Application
function HomeApp() {
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);
  const [timeStr, setTimeStr] = useState('15:38');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Initial Mock State & DB Sync
  const [checklistList, setChecklistList] = useState([
    {
      id: 'SEC-PASS-2026-001',
      site: '삼성전자 평택캠퍼스 (P3 라인)',
      visitorName: '홍길동',
      company: '(주)위드설비보안',
      hostName: '김삼성 책임',
      materials: '노트북 1대 (SN-SAMP3-9941), 계측기 1대',
      status: '승인완료',
      createdAt: '2026-08-07 09:15'
    },
    {
      id: 'SEC-PASS-2026-002',
      site: 'SK하이닉스 이천캠퍼스 (M16 라인)',
      visitorName: '이수석',
      company: '(주)한국반도체엔지니어링',
      hostName: '박하이 수석',
      materials: 'EUV 센서 단말기 2대, 보안 USB 64GB',
      status: '승인완료',
      createdAt: '2026-08-07 11:30'
    }
  ]);

  const [otpAccounts, setOtpAccounts] = useState([
    { id: 'vpn', name: '회사 SSL-VPN 2차인증', issuer: 'Corp Gateway', code: '849 201' },
    { id: 'mail', name: '사내 보안 메인 웹메일', issuer: 'mail.company.com', code: '310 948' },
    { id: 'erp', name: '통합 ERP & 재무 시스템', issuer: 'erp.internal.net', code: '529 114' }
  ]);

  const [vaultItems, setVaultItems] = useState([
    { id: '1', title: '사내 보안 Wi-Fi WPA3 암호', category: 'Network', secret: 'Secured_Corp_2026!#Key' },
    { id: '2', title: 'AWS Cloud Admin API Token', category: 'API Key', secret: 'ak_live_89a3f2e109bc48d7a1e' }
  ]);

  const [otpTimer, setOtpTimer] = useState(30);
  const [revealedVault, setRevealedVault] = useState({});

  // Clock Timer & Database Auto-load
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${h}:${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 5000);

    // Load from DB
    (async () => {
      const dbChecklists = await loadFromDB('checklists');
      if (dbChecklists.length > 0) setChecklistList(dbChecklists);

      const dbOtp = await loadFromDB('otp');
      if (dbOtp.length > 0) setOtpAccounts(dbOtp);

      const dbVault = await loadFromDB('vault');
      if (dbVault.length > 0) setVaultItems(dbVault);
    })();

    return () => clearInterval(interval);
  }, []);

  // 30s OTP Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          setOtpAccounts((accs) =>
            accs.map((a) => ({
              ...a,
              code: `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`
            }))
          );
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePinPress = (num) => {
    if (pinInput.length < 6) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
      setPinError(false);

      if (nextPin.length === 6) {
        if (nextPin === '123456') {
          setIsLocked(false);
          setPinInput('');
          showToast('보안 인증 성공: 단말기 및 웹 세션 잠금이 해제되었습니다.');
        } else {
          setPinError(true);
          setTimeout(() => {
            setPinInput('');
            setPinError(false);
          }, 800);
        }
      }
    }
  };

  const handleAddChecklist = async () => {
    const newPass = {
      id: `SEC-PASS-2026-00${checklistList.length + 1}`,
      site: '삼성전자 화성캠퍼스 (EUV 라인)',
      visitorName: '김연구',
      company: '(주)위드보안네트웍스',
      hostName: '이화성 선임',
      materials: '보안 검수 노트북 1대 (SEAL-9921)',
      status: '승인완료',
      createdAt: new Date().toLocaleString('ko-KR')
    };
    await saveToDB('checklists', newPass);
    setChecklistList([newPass, ...checklistList]);
    showToast('[삼성전자 화성] 출입 서약서 및 자재 반입 승인이 DB에 등록되었습니다.');
  };

  const handleAddOtp = async () => {
    const randomCode = `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
    const newAcc = {
      id: Date.now().toString(),
      name: '사내 통합 SSO 2차인증',
      issuer: 'sso.company.com',
      code: randomCode
    };
    await saveToDB('otp', newAcc);
    setOtpAccounts([...otpAccounts, newAcc]);
    showToast('새 2FA OTP 계정이 DB에 등록되었습니다.');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(0, 242, 254, 0.4)',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 242, 254, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          <span>🔔</span> <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Mobile App Container */}
      <div className="mobile-shell-wrapper">
        
        {/* Top Header */}
        <div style={{
          padding: '8px 16px',
          background: '#04070e',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 60
        }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff', letterSpacing: '0.5px' }}>
            🛡️ WithSecurity <span style={{ color: '#00f2fe', fontSize: '10px' }}>v1.0</span>
          </span>

          <button
            onClick={() => setIsLocked(true)}
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#f43f5e',
              padding: '4px 10px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            🔒 화면 잠그기
          </button>
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <span className="mono-font" style={{ fontSize: '13px' }}>{timeStr}</span>
          <div className="dynamic-island">
            <span style={{ fontSize: '9px', color: '#00f2fe', fontWeight: '700' }}>VPN ACTIVE</span>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>5G 100%</span>
        </div>

        {/* Tab Content */}
        <div className="app-content">
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ fontSize: '11px', color: '#00f2fe', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Company Device Audit
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>
                  디바이스 보안 상태
                </h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'conic-gradient(#00f2fe 0% 98%, rgba(255,255,255,0.1) 98% 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ width: '66px', height: '66px', borderRadius: '50%', background: '#0a0f1d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="mono-font" style={{ fontSize: '22px', fontWeight: '800', color: '#fff' }}>98</span>
                      <span style={{ fontSize: '9px', color: '#94a3b8' }}>/ 100점</span>
                    </div>
                  </div>

                  <div>
                    <span className="badge-secure" style={{ marginBottom: '6px' }}>✓ 최고 보안 수준</span>
                    <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                      사내 보안 정책 준수율 100%. 위협 무결성 완료.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="glass-panel" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '700' }}>● 무결성 확인</div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>루팅/탈옥 감지</div>
                </div>
                <div className="glass-panel" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#00f2fe', fontWeight: '700' }}>● AES-256</div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>단말기 암호화</div>
                </div>
              </div>
            </div>
          )}

          {/* Security Checklist Tab */}
          {activeTab === 'entryCheck' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>삼성 · SK하이닉스 출입 Hub</h2>
                <button onClick={handleAddChecklist} className="glass-button-primary" style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px' }}>
                  + 서약서 등록
                </button>
              </div>

              {checklistList.map((item) => (
                <div key={item.id} className="glass-panel" style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#00f2fe', background: 'rgba(0,242,254,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      {item.site}
                    </span>
                    <span style={{ fontSize: '10px', color: '#10b981' }}>{item.status}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    {item.visitorName} ({item.company})
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    접견자: {item.hostName} | 지입자재: {item.materials}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Access Pass QR Tab */}
          {activeTab === 'access' && (
            <div className="glass-panel" style={{ padding: '24px 20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>사내 모바일 출입 QR Pass</h2>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '16px' }}>ID: EMP-2026-0892 | Level 4 Security</div>

              <div style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '16px',
                width: '180px',
                height: '180px',
                margin: '0 auto 16px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                color: '#000',
                fontWeight: '800',
                fontSize: '14px'
              }}>
                [ DYNAMIC QR SCAN ]
              </div>

              <button onClick={() => showToast('출입 보안 QR 토큰이 즉시 갱신되었습니다.')} className="glass-button" style={{ padding: '8px 16px', borderRadius: '14px', fontSize: '12px', fontWeight: '600' }}>
                🔄 즉시 토큰 갱신
              </button>
            </div>
          )}

          {/* 2FA OTP Tab */}
          {activeTab === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>2FA OTP 인증센터</h2>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>자동 갱신 남은 시간: {otpTimer}초</div>
                </div>
                <button onClick={handleAddOtp} className="glass-button-primary" style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px' }}>
                  + 계정 추가
                </button>
              </div>

              {otpAccounts.map((acc) => (
                <div key={acc.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{acc.name}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{acc.issuer}</div>
                    <div className="mono-font" style={{ fontSize: '22px', fontWeight: '800', color: '#00f2fe', marginTop: '4px' }}>
                      {acc.code}
                    </div>
                  </div>
                  <button onClick={() => { navigator.clipboard?.writeText(acc.code.replace(/\s+/g, '')); showToast(`OTP 코드 [${acc.code}]가 복사되었습니다.`); }} className="glass-button" style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '11px' }}>
                    복사
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Vault Secrets Tab */}
          {activeTab === 'vault' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>암호화 기밀 보관함 (AES-256)</h2>
              {vaultItems.map((item) => (
                <div key={item.id} className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '10px', color: '#00f2fe', fontWeight: '700', marginBottom: '4px' }}>{item.category}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{item.title}</div>
                  <div className="mono-font" style={{ background: 'rgba(0,0,0,0.4)', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: revealedVault[item.id] ? '#10b981' : '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{revealedVault[item.id] ? item.secret : '••••••••••••••••••••'}</span>
                    <button onClick={() => setRevealedVault(prev => ({ ...prev, [item.id]: !prev[item.id] }))} style={{ background: 'none', border: 'none', color: '#00f2fe', cursor: 'pointer', fontSize: '11px' }}>
                      {revealedVault[item.id] ? '숨기기' : '보기'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Bottom Nav */}
        <nav className="bottom-nav">
          <button onClick={() => setActiveTab('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
            <span>보안 진단</span>
          </button>
          <button onClick={() => setActiveTab('entryCheck')} className={`nav-item ${activeTab === 'entryCheck' ? 'active' : ''}`}>
            <span>출입 서약</span>
          </button>
          <button onClick={() => setActiveTab('access')} className={`nav-item ${activeTab === 'access' ? 'active' : ''}`}><span>출입 QR</span></button>
          <button onClick={() => setActiveTab('otp')} className={`nav-item ${activeTab === 'otp' ? 'active' : ''}`}><span>OTP</span></button>
          <button onClick={() => setActiveTab('vault')} className={`nav-item ${activeTab === 'vault' ? 'active' : ''}`}><span>기밀함</span></button>
        </nav>
      </div>

      {/* Lock Screen Modal */}
      {isLocked && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 200,
          background: 'rgba(5, 8, 16, 0.96)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>WithSecurity 잠김</h2>
          <p style={{ fontSize: '12px', color: pinError ? '#f43f5e' : '#94a3b8', marginBottom: '20px' }}>
            {pinError ? '잘못된 PIN 번호입니다 (테스트 PIN: 123456)' : '보안 PIN 6자리를 입력하세요 (123456)'}
          </p>

          {/* Dots */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: pinInput.length > idx ? (pinError ? '#f43f5e' : '#00f2fe') : 'rgba(255,255,255,0.15)'
              }} />
            ))}
          </div>

          {/* Keypad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '220px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button key={n} onClick={() => handlePinPress(n.toString())} className="glass-button" style={{ height: '52px', borderRadius: '50%', fontSize: '18px', fontWeight: '700' }}>
                {n}
              </button>
            ))}
            <button onClick={() => { setIsLocked(false); showToast('생체 인증 해제 완료'); }} className="glass-button" style={{ height: '52px', borderRadius: '50%', fontSize: '11px', color: '#00f2fe' }}>
              지문
            </button>
            <button onClick={() => handlePinPress('0')} className="glass-button" style={{ height: '52px', borderRadius: '50%', fontSize: '18px', fontWeight: '700' }}>
              0
            </button>
            <button onClick={() => setPinInput((prev) => prev.slice(0, -1))} className="glass-button" style={{ height: '52px', borderRadius: '50%', fontSize: '11px', color: '#94a3b8' }}>
              지우기
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HomeApp />);
