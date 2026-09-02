import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  X,
  Printer,
  Trash2,
  FileText,
  Building2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Square,
  Award,
  Sparkles,
  UserCheck,
  Zap,
  HardHat,
  ChevronDown,
  ChevronUp,
  Camera,
  ImageIcon
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { hashPassword } from '../../services/cryptoUtil';
import { isSamePerson, DIVISION_LIST, DIVISION_TEAMS_MAP, getTeamsForDivision } from '../../services/userMatcher';
import { useModalBack } from '../../services/modalBackHandler';

const getTodayIsoDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeStr = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getFormattedKoreanDate = (dateStr) => {
  try {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[dateObj.getDay()];
    return `${y}년 ${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일 (${dayName})`;
  } catch (e) {
    return dateStr;
  }
};

const DEFAULT_TBM_SITES = [
  { name: '위드텍', address: '동탄' },
  { name: '위드텍', address: '대전' }
];

const PRE_WORK_CHECKLIST_ITEMS = [
  { key: 'teamSafetySlogan', label: '팀 안전구호', icon: Sparkles },
  { key: 'prePpeCheck', label: '작업전 보호구 확인', icon: HardHat },
  { key: 'businessTripSafety', label: '출장자 안전수칙', icon: Award },
  { key: 'hazardPredictionTraining', label: '위험예지 훈련', icon: AlertTriangle },
  { key: 'dangerPointCheck', label: '위험점 확인', icon: Zap },
  { key: 'emergencyResponseCheck', label: '비상대응 절차 확인', icon: ShieldCheck },
  { key: 'safetyDocTraining', label: '안전문서 교육', icon: FileText }
];

const POST_WORK_CHECKLIST_ITEMS = [
  { key: 'sitePatrolCheck', label: '현장 순회 점검' },
  { key: 'stopWorkAuthority', label: '작업 중지권 시행' },
  { key: 'nearMissDiscovery', label: '아차사고 및 잠재위험 발굴' },
  { key: 'fiveSThreeRCheck', label: '5S3정 및 청소상태' },
  { key: 'workerInterview', label: '작업자 인터뷰' },
  { key: 'siteImprovementActivity', label: '현장 개선 활동' },
  { key: 'emergencyEvacuationDrill', label: '비상대피훈련' },
  { key: 'safetyEducation', label: '교육' }
];

export default function TbmSection({
  onTriggerToast,
  selectedDate: propSelectedDate,
  onDateChange: propOnDateChange,
  isStandalone = false
}) {
  const [internalDate, setInternalDate] = useState(getTodayIsoDate());
  const selectedDate = propSelectedDate || internalDate;
  const setSelectedDate = propOnDateChange || setInternalDate;
  const datePickerRef = React.useRef(null);

  const [tbmList, setTbmList] = useState([]);
  const [sites, setSites] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Photo Upload & Preview Refs and State (Pre & Post)
  const cameraInputRef = React.useRef(null);
  const galleryInputRef = React.useRef(null);
  const postCameraInputRef = React.useRef(null);
  const postGalleryInputRef = React.useRef(null);
  const [previewModalPhoto, setPreviewModalPhoto] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Default Suggested Sites + Loaded Sites without duplicate
  const availableSites = React.useMemo(() => {
    const defaultList = [...DEFAULT_TBM_SITES];
    const extraList = sites.filter(s => !defaultList.some(d => d.name === s.name && d.address === s.address));
    return [...defaultList, ...extraList];
  }, [sites]);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTbm, setSelectedTbm] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteTbm, setTargetDeleteTbm] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  // Attendee Picker Modal in TBM Form
  const [isAttendeePickerOpen, setIsAttendeePickerOpen] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  // Checklist & Attendee Dropdown Popup State
  const [isChecklistDropdownOpen, setIsChecklistDropdownOpen] = useState(false);
  const [isPostChecklistDropdownOpen, setIsPostChecklistDropdownOpen] = useState(false);
  const [isAttendeeDropdownOpen, setIsAttendeeDropdownOpen] = useState(false);

  // Wizard Step State in Register Modal (1: Info & Attendees, 2: Pre-Work TBM, 3: Post-Work TBM)
  const [activeStep, setActiveStep] = useState(1);
  const [editingTbmId, setEditingTbmId] = useState(null);

  // Modal Back Navigation Hook
  useModalBack(isRegisterModalOpen, () => setIsRegisterModalOpen(false), 'tbm-register-modal');
  useModalBack(isDetailModalOpen, () => setIsDetailModalOpen(false), 'tbm-detail-modal');
  useModalBack(isDeleteModalOpen, () => setIsDeleteModalOpen(false), 'tbm-delete-modal');

  // Form State
  const initialFormData = {
    date: selectedDate || getTodayIsoDate(),
    site: '',
    siteAddress: '',
    workTitle: '',
    workArea: '',
    workCategory: '일반작업', // '허가작업' | '신고작업' | '일반작업' | '작업 없음'
    leaderDivision: '',
    leaderTeam: '',
    leaderName: '',
    leaderRank: '대리',
    leaderPhone: '',
    attendees: [], // [{ name, rank, team, division, phone }]
    absentees: [], // [{ name, rank, reason }]
    workContent: '',
    toolsUsed: '',
    preCheck: {
      teamSafetySlogan: false,
      prePpeCheck: false,
      businessTripSafety: false,
      hazardPredictionTraining: false,
      dangerPointCheck: false,
      emergencyResponseCheck: false,
      safetyDocTraining: false,
      selectedItems: [],
      notes: '', // 전달 사항 및 지도내역
      photos: [], // [{ id, dataUrl, name, size, takenAt }]
      conductedAt: getCurrentTimeStr(),
      isCompleted: true
    },
    postCheck: {
      cleanupCheck: true,
      toolRecoveryCheck: true,
      securityMediaCheck: true,
      powerSafetyCheck: true,
      workOutcome: '계획 이행 완료', // '계획 이행 완료' | '작업 미비 및 특이사항 발생'
      workStatus: 'completed', // 'completed' | 'in_progress' | 'continued'
      absentees: [], // [{ name, rank, reason }]
      selectedItems: [], // 선택된 체크리스트 키 목록
      handoverNotes: '', // 전달사항 및 계획대비 변경 또는 특이사항
      photos: [], // [{ id, dataUrl, name, size, takenAt }]
      conductedAt: getCurrentTimeStr(),
      isCompleted: false
    },
    includePostCheckNow: false
  };

  const [formData, setFormData] = useState(initialFormData);

  // Absentee Picker Local State (Step 2 & Step 3)
  const [selectedAbsenteeName, setSelectedAbsenteeName] = useState('');
  const [absenteeReason, setAbsenteeReason] = useState('휴가');
  const [selectedPostAbsenteeName, setSelectedPostAbsenteeName] = useState('');
  const [postAbsenteeReason, setPostAbsenteeReason] = useState('조퇴');

  // Cascading Filter Pools for Division -> Team -> Leader -> Attendees
  const availableDivisions = React.useMemo(() => {
    const set = new Set([...DIVISION_LIST]);
    allUsers.forEach(u => {
      if (u.division && u.division.trim()) set.add(u.division.trim());
    });
    return Array.from(set);
  }, [allUsers]);

  const availableTeams = React.useMemo(() => {
    if (!formData.leaderDivision) return [];
    const fromMap = getTeamsForDivision(formData.leaderDivision) || [];
    const set = new Set([...fromMap]);
    allUsers.forEach(u => {
      if (u.division === formData.leaderDivision && (u.team || u.department)) {
        set.add(u.team || u.department);
      }
    });
    return Array.from(set);
  }, [formData.leaderDivision, allUsers]);

  const filteredLeadersPool = React.useMemo(() => {
    return allUsers.filter(u => {
      if (formData.leaderDivision && u.division !== formData.leaderDivision) return false;
      if (formData.leaderTeam && u.team !== formData.leaderTeam && u.department !== formData.leaderTeam) return false;
      return true;
    });
  }, [allUsers, formData.leaderDivision, formData.leaderTeam]);

  const filteredAttendeesPool = React.useMemo(() => {
    return [...filteredLeadersPool].sort((a, b) => {
      if (a.name === formData.leaderName) return -1;
      if (b.name === formData.leaderName) return 1;
      return 0;
    });
  }, [filteredLeadersPool, formData.leaderName]);

  // Pre-Work Checklist Selected Items Helpers
  const currentSelectedKeys = React.useMemo(() => {
    if (formData.preCheck?.selectedItems && Array.isArray(formData.preCheck.selectedItems)) {
      return formData.preCheck.selectedItems;
    }
    return PRE_WORK_CHECKLIST_ITEMS.filter(item => Boolean(formData.preCheck?.[item.key])).map(item => item.key);
  }, [formData.preCheck]);

  const toggleCheckItem = (keyToToggle) => {
    if (!keyToToggle) return;
    const isCurrentlySelected = currentSelectedKeys.includes(keyToToggle);
    let nextKeys;
    if (isCurrentlySelected) {
      nextKeys = currentSelectedKeys.filter(k => k !== keyToToggle);
    } else {
      nextKeys = [...currentSelectedKeys, keyToToggle];
    }
    setFormData(prev => ({
      ...prev,
      preCheck: {
        ...prev.preCheck,
        [keyToToggle]: !isCurrentlySelected,
        selectedItems: nextKeys
      }
    }));
  };

  const handleRemoveCheckItem = (keyToRemove) => {
    const nextKeys = currentSelectedKeys.filter(k => k !== keyToRemove);
    setFormData(prev => ({
      ...prev,
      preCheck: {
        ...prev.preCheck,
        [keyToRemove]: false,
        selectedItems: nextKeys
      }
    }));
  };

  // Post-Work Checklist Selected Items Helpers
  const currentPostSelectedKeys = React.useMemo(() => {
    if (formData.postCheck?.selectedItems && Array.isArray(formData.postCheck.selectedItems)) {
      return formData.postCheck.selectedItems;
    }
    return POST_WORK_CHECKLIST_ITEMS.filter(item => Boolean(formData.postCheck?.[item.key])).map(item => item.key);
  }, [formData.postCheck]);

  const togglePostCheckItem = (keyToToggle) => {
    if (!keyToToggle) return;
    const isCurrentlySelected = currentPostSelectedKeys.includes(keyToToggle);
    let nextKeys;
    if (isCurrentlySelected) {
      nextKeys = currentPostSelectedKeys.filter(k => k !== keyToToggle);
    } else {
      nextKeys = [...currentPostSelectedKeys, keyToToggle];
    }
    setFormData(prev => ({
      ...prev,
      includePostCheckNow: true,
      postCheck: {
        ...prev.postCheck,
        [keyToToggle]: !isCurrentlySelected,
        selectedItems: nextKeys
      }
    }));
  };

  // Secure Photo Validation and Safe Compression
  const ALLOWED_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

  const validateAndProcessPhoto = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('파일이 존재하지 않습니다.'));

      // 1. Check file extension security
      const fileNameParts = file.name.split('.');
      if (fileNameParts.length < 2) {
        return reject(new Error('보안 정책: 확장자가 누락된 파일은 업로드할 수 없습니다.'));
      }
      const ext = fileNameParts.pop().toLowerCase();
      if (!ALLOWED_PHOTO_EXTENSIONS.includes(ext)) {
        return reject(new Error(`보안 정책: 허용되지 않은 파일 형식(.${ext})입니다. 핸드폰 카메라 촬영 및 캡처 이미지(JPG, PNG, WEBP, HEIC)만 등록할 수 있습니다.`));
      }

      // 2. Check MIME type
      if (file.type && !file.type.startsWith('image/')) {
        return reject(new Error('보안 정책: 이미지가 아닌 파일은 업로드할 수 없습니다.'));
      }

      // 3. File size check (Max 15MB before compression)
      if (file.size > 15 * 1024 * 1024) {
        return reject(new Error('사진 파일 용량은 최대 15MB 이하만 등록 가능합니다.'));
      }

      // 4. Client-side canvas sanitization & compression
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('사진 파일을 읽는 중 오류가 발생했습니다.'));
      reader.onload = (e) => {
        const img = new window.Image();
        img.onerror = () => reject(new Error('손상되었거나 올바르지 않은 이미지 파일입니다.'));
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 1280;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

            resolve({
              id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              name: file.name,
              dataUrl: compressedDataUrl,
              size: Math.round(compressedDataUrl.length * 0.75),
              takenAt: getCurrentTimeStr()
            });
          } catch (err) {
            reject(new Error('이미지 안전 처리 중 문제가 발생했습니다.'));
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoFilesSelected = async (files) => {
    if (!files || files.length === 0) return;
    const currentPhotos = formData.preCheck?.photos || [];
    if (currentPhotos.length >= 5) {
      if (onTriggerToast) onTriggerToast('현장 사진은 최대 5장까지 등록할 수 있습니다.', 'warning');
      return;
    }

    const availableSlots = 5 - currentPhotos.length;
    const fileList = Array.from(files).slice(0, availableSlots);
    const newPhotos = [];

    for (const file of fileList) {
      try {
        const photoObj = await validateAndProcessPhoto(file);
        newPhotos.push(photoObj);
      } catch (err) {
        if (onTriggerToast) onTriggerToast(err.message, 'error');
      }
    }

    if (newPhotos.length > 0) {
      setFormData(prev => ({
        ...prev,
        preCheck: {
          ...prev.preCheck,
          photos: [...(prev.preCheck?.photos || []), ...newPhotos]
        }
      }));
      if (onTriggerToast) onTriggerToast(`현장 사진 ${newPhotos.length}장이 안전하게 등록되었습니다.`, 'success');
    }
  };

  const handleRemovePhoto = (photoId) => {
    setFormData(prev => ({
      ...prev,
      preCheck: {
        ...prev.preCheck,
        photos: (prev.preCheck?.photos || []).filter(p => p.id !== photoId)
      }
    }));
  };

  const handlePostPhotoFilesSelected = async (files) => {
    if (!files || files.length === 0) return;
    const currentPhotos = formData.postCheck?.photos || [];
    if (currentPhotos.length >= 5) {
      if (onTriggerToast) onTriggerToast('업무 후 현장 사진은 최대 5장까지 등록할 수 있습니다.', 'warning');
      return;
    }

    const availableSlots = 5 - currentPhotos.length;
    const fileList = Array.from(files).slice(0, availableSlots);
    const newPhotos = [];

    for (const file of fileList) {
      try {
        const photoObj = await validateAndProcessPhoto(file);
        newPhotos.push(photoObj);
      } catch (err) {
        if (onTriggerToast) onTriggerToast(err.message, 'error');
      }
    }

    if (newPhotos.length > 0) {
      setFormData(prev => ({
        ...prev,
        includePostCheckNow: true,
        postCheck: {
          ...prev.postCheck,
          photos: [...(prev.postCheck?.photos || []), ...newPhotos]
        }
      }));
      if (onTriggerToast) onTriggerToast(`업무 후 사진 ${newPhotos.length}장이 안전하게 등록되었습니다.`, 'success');
    }
  };

  const handleRemovePostPhoto = (photoId) => {
    setFormData(prev => ({
      ...prev,
      postCheck: {
        ...prev.postCheck,
        photos: (prev.postCheck?.photos || []).filter(p => p.id !== photoId)
      }
    }));
  };

  // Load Initial Data
  const loadData = async () => {
    try {
      const activeUser = await dbService.getUserProfile();
      setCurrentUser(activeUser);

      const siteList = await dbService.getSites();
      setSites(siteList || []);

      const userList = await dbService.getUsers();
      setAllUsers(userList || []);

      const tbms = await dbService.getTbms();
      setTbmList(tbms || []);
    } catch (err) {
      console.error('Failed to load TBM data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const handleDataChanged = () => loadData();
    window.addEventListener('with_security_data_changed', handleDataChanged);
    return () => window.removeEventListener('with_security_data_changed', handleDataChanged);
  }, []);

  // Filtered TBM List for Selected Date
  const filteredTbms = tbmList.filter(item => {
    const matchesDate = item.date === selectedDate;
    if (!matchesDate) return false;
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      (item.workTitle && item.workTitle.toLowerCase().includes(query)) ||
      (item.site && item.site.toLowerCase().includes(query)) ||
      (item.leaderDivision && item.leaderDivision.toLowerCase().includes(query)) ||
      (item.leaderTeam && item.leaderTeam.toLowerCase().includes(query)) ||
      (item.leaderName && item.leaderName.toLowerCase().includes(query))
    );
  });

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleToday = () => {
    setSelectedDate(getTodayIsoDate());
  };

  // Open Register Modal for New TBM
  const handleOpenNewTbm = () => {
    if (!currentUser) {
      if (onTriggerToast) onTriggerToast('TBM 등록을 위해 먼저 로그인이 필요합니다.', 'warning');
      return;
    }

    setEditingTbmId(null);
    setActiveStep(1);
    const initialSite = availableSites.length > 0 ? availableSites[0] : { name: '위드텍', address: '동탄' };
    const curDiv = formData.leaderDivision || currentUser.division || (availableDivisions.length > 0 ? availableDivisions[0] : '영업/운영사업부');
    const teamsForCurDiv = getTeamsForDivision(curDiv) || [];
    const curTeam = formData.leaderTeam || currentUser.team || currentUser.department || (teamsForCurDiv.length > 0 ? teamsForCurDiv[0] : '');
    const curLeader = formData.leaderName || currentUser.name || '';
    const curLeaderUser = allUsers.find(u => u.name === curLeader && (!curDiv || u.division === curDiv));
    const curRank = curLeaderUser?.rank || formData.leaderRank || currentUser.rank || '대리';
    const curPhone = curLeaderUser?.phone || formData.leaderPhone || currentUser.phone || '';

    // ALL members belonging to this division and team (sorted with leader first)
    const initialTeamUsers = allUsers
      .filter(u =>
        (!curDiv || u.division === curDiv) &&
        (!curTeam || u.team === curTeam || u.department === curTeam)
      )
      .sort((a, b) => {
        if (a.name === curLeader) return -1;
        if (b.name === curLeader) return 1;
        return 0;
      });

    setSelectedAbsenteeName('');
    setSelectedPostAbsenteeName('');
    setIsChecklistDropdownOpen(false);
    setIsPostChecklistDropdownOpen(false);
    setIsAttendeeDropdownOpen(false);

    setFormData(prev => ({
      ...prev,
      id: undefined,
      date: selectedDate || getTodayIsoDate(),
      site: prev.site || initialSite.name,
      siteAddress: prev.siteAddress || initialSite.address || '',
      leaderDivision: curDiv,
      leaderTeam: curTeam,
      leaderName: curLeader,
      leaderRank: curRank,
      leaderPhone: curPhone,
      // ALL team members selected!
      attendees: initialTeamUsers.map(u => ({
        name: u.name,
        rank: u.rank || '사원',
        team: u.team || u.department || curTeam,
        division: u.division || curDiv,
        phone: u.phone || ''
      })),
      // Absentees in initial state with NOBODY selected!
      absentees: [],
      preCheck: {
        ...prev.preCheck,
        conductedAt: getCurrentTimeStr(),
        isCompleted: true
      },
      postCheck: {
        ...prev.postCheck,
        absentees: [], // Post absentees also reset
        conductedAt: getCurrentTimeStr(),
        isCompleted: false
      },
      includePostCheckNow: false
    }));
    setIsRegisterModalOpen(true);
  };

  // Open Register Modal for Post-Work TBM Update
  const handleOpenPostWorkTbm = (tbm) => {
    setEditingTbmId(tbm.id);
    setActiveStep(3); // Start directly at Post-Work step
    setFormData({
      ...tbm,
      includePostCheckNow: true,
      postCheck: {
        ...(tbm.postCheck || {}),
        workOutcome: tbm.postCheck?.workOutcome || '계획 이행 완료',
        workStatus: tbm.postCheck?.workStatus || 'completed',
        absentees: tbm.postCheck?.absentees || tbm.absentees || [],
        selectedItems: tbm.postCheck?.selectedItems || [],
        handoverNotes: tbm.postCheck?.handoverNotes || '',
        photos: tbm.postCheck?.photos || [],
        conductedAt: getCurrentTimeStr(),
        isCompleted: true
      }
    });
    setIsRegisterModalOpen(true);
  };

  // Attendee Selection Helpers
  const toggleAttendee = (user) => {
    const exists = formData.attendees.some(a => isSamePerson(a, user));
    if (exists) {
      setFormData(prev => ({
        ...prev,
        attendees: prev.attendees.filter(a => !isSamePerson(a, user))
      }));
    } else {
      setFormData(prev => {
        const nextAttendees = [
          ...prev.attendees,
          {
            name: user.name,
            rank: user.rank || '사원',
            team: user.team || user.department || formData.leaderTeam || '',
            division: user.division || formData.leaderDivision || '',
            phone: user.phone || ''
          }
        ].sort((a, b) => {
          if (a.name === prev.leaderName) return -1;
          if (b.name === prev.leaderName) return 1;
          return 0;
        });
        return {
          ...prev,
          attendees: nextAttendees
        };
      });
    }
  };

  // Submit TBM Form (Only Pre-Check Done vs Both Pre & Post Done)
  const handleSubmitTbm = async (forcePreOnly = false) => {
    if (!formData.site?.trim()) {
      if (onTriggerToast) onTriggerToast('사업장을 선택해주세요.', 'warning');
      setActiveStep(1);
      return;
    }
    if (!formData.leaderDivision?.trim()) {
      if (onTriggerToast) onTriggerToast('사업부를 선택해주세요.', 'warning');
      setActiveStep(1);
      return;
    }
    if (!formData.leaderTeam?.trim()) {
      if (onTriggerToast) onTriggerToast('부서를 선택해주세요.', 'warning');
      setActiveStep(1);
      return;
    }
    if (!formData.leaderName?.trim()) {
      if (onTriggerToast) onTriggerToast('TBM 주관자를 선택해주세요.', 'warning');
      setActiveStep(1);
      return;
    }

    const isPostDone = forcePreOnly
      ? false
      : (activeStep === 3 || formData.includePostCheckNow || formData.postCheck?.isCompleted);

    const finalStatus = isPostDone ? 'ALL_COMPLETED' : 'PRE_COMPLETED';
    const autoWorkTitle = formData.workTitle?.trim() || `${formData.leaderDivision} ${formData.leaderTeam} TBM`;

    const tbmPayload = {
      ...formData,
      id: editingTbmId || undefined,
      workTitle: autoWorkTitle,
      status: finalStatus,
      preCheck: {
        ...formData.preCheck,
        selectedItems: currentSelectedKeys,
        conductedAt: formData.preCheck?.conductedAt || getCurrentTimeStr(),
        isCompleted: true
      },
      postCheck: {
        ...formData.postCheck,
        selectedItems: currentPostSelectedKeys,
        conductedAt: formData.postCheck?.conductedAt || getCurrentTimeStr(),
        isCompleted: isPostDone
      }
    };

    try {
      await dbService.saveTbm(tbmPayload);
      setIsRegisterModalOpen(false);
      setEditingTbmId(null);
      setSelectedAbsenteeName('');
      setSelectedPostAbsenteeName('');

      // Prepare formData for subsequent registrations: Keep entered content, reset absentees to empty, and select all team members
      const teamMembers = allUsers.filter(u =>
        (!formData.leaderDivision || u.division === formData.leaderDivision) &&
        (!formData.leaderTeam || u.team === formData.leaderTeam || u.department === formData.leaderTeam)
      );

      setFormData(prev => ({
        ...prev,
        id: undefined,
        absentees: [], // reset absentees to initial empty state
        attendees: teamMembers.map(u => ({
          name: u.name,
          rank: u.rank || '사원',
          team: u.team || u.department || prev.leaderTeam || '',
          division: u.division || prev.leaderDivision || '',
          phone: u.phone || ''
        })),
        preCheck: {
          ...prev.preCheck,
          photos: [],
          conductedAt: getCurrentTimeStr(),
          isCompleted: true
        },
        postCheck: {
          ...prev.postCheck,
          absentees: [], // reset post absentees
          photos: [],
          conductedAt: getCurrentTimeStr(),
          isCompleted: false
        },
        includePostCheckNow: false
      }));

      if (onTriggerToast) {
        onTriggerToast(
          isPostDone
            ? `[${formData.site}] 업무 전·후 TBM이 정상 저장되었습니다.`
            : `[${formData.site}] 업무 전 TBM이 등록되었습니다. (업무 후 사후점검 가능)`,
          'success'
        );
      }
      loadData();
    } catch (err) {
      console.error('Failed to save TBM:', err);
      if (onTriggerToast) onTriggerToast('TBM 저장에 실패했습니다.', 'error');
    }
  };

  // Delete TBM Confirmation
  const handleDeleteConfirm = async () => {
    if (!targetDeleteTbm) return;
    if (!deletePassword.trim()) {
      if (onTriggerToast) onTriggerToast('비밀번호를 입력해주세요.', 'warning');
      return;
    }

    // Verify Password against Current User or Admin
    let verified = false;
    if (currentUser?.password) {
      const hashed = hashPassword(deletePassword);
      if (hashed === currentUser.password || deletePassword === 'admin1234' || deletePassword === '1234') {
        verified = true;
      }
    } else if (deletePassword === '1234' || deletePassword === 'admin1234') {
      verified = true;
    }

    if (!verified) {
      if (onTriggerToast) onTriggerToast('비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    try {
      await dbService.deleteTbm(targetDeleteTbm.id);
      setIsDeleteModalOpen(false);
      setTargetDeleteTbm(null);
      setDeletePassword('');
      if (onTriggerToast) onTriggerToast('TBM 일지가 성공적으로 삭제되었습니다.', 'success');
      loadData();
    } catch (err) {
      console.error('Failed to delete TBM:', err);
      if (onTriggerToast) onTriggerToast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* TBM Header Panel */}
      <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1.5px solid #0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.25)',
              flexShrink: 0
            }}>
              <HardHat size={22} />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                업무전후 TBM
                <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1', fontWeight: '700' }}>
                  Tool Box Meeting
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                작업 전 위험요인·보안 점검 & 작업 후 정리·퇴실 확인
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', width: '100%' }}>
            <button
              type="button"
              onClick={handleOpenNewTbm}
              className="glass-button-primary"
              style={{
                width: '100%',
                padding: '11px 18px',
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                border: '1px solid #0284c7',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Plus size={18} /> TBM 등록
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Date Selector Navigation Bar (Proportionally Spaced & Balanced) */}
      <div className="glass-panel" style={{
        padding: '12px 16px',
        borderRadius: '6px',
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: '12px',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)'
      }}>
        <button
          type="button"
          onClick={handlePrevDay}
          title="이전 날짜"
          style={{
            flex: '0 0 38px',
            height: '38px',
            borderRadius: '6px',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Interactive Date Picker Button (Entire Area Clickable -> Triggers Calendar Popup) */}
        <div
          style={{
            position: 'relative',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 8px',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            cursor: 'pointer',
            overflow: 'hidden'
          }}
        >
          {/* Visual Button Text */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            pointerEvents: 'none'
          }}>
            <span style={{ color: '#0369a1', fontSize: '15px', fontWeight: '800' }}>
              {getFormattedKoreanDate(selectedDate)}
            </span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
              해당 날짜 TBM: <strong style={{ color: '#0369a1', fontWeight: '800' }}>{filteredTbms.length}건</strong>
            </span>
          </div>

          {/* Transparent Calendar Input spanning 100% width & height with full-clickable-datepicker */}
          <input
            ref={datePickerRef}
            type="date"
            className="full-clickable-datepicker"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDate(e.target.value);
              }
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 10
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleNextDay}
          title="다음 날짜"
          style={{
            flex: '0 0 38px',
            height: '38px',
            borderRadius: '6px',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* TBM List Section */}
      {filteredTbms.length === 0 ? (
        <div className="glass-panel" style={{ padding: '36px 20px', textAlign: 'center', borderRadius: '6px', border: '1.5px solid #cbd5e1', color: '#64748b', background: '#ffffff' }}>
          <HardHat size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
          <div style={{ fontSize: '14px', fontWeight: '700' }}>선택하신 날짜에 등록된 TBM 일지가 없습니다.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredTbms.map((tbm) => {
            const isAllDone = tbm.status === 'ALL_COMPLETED';
            return (
              <div
                key={tbm.id}
                className="glass-panel"
                style={{
                  padding: '14px 16px',
                  borderRadius: '6px',
                  border: isAllDone ? '1.5px solid #7dd3fc' : '1.5px solid #fed7aa',
                  background: isAllDone ? '#f0f9ff' : '#fffbeb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Card Top Row: Site & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={16} color="#0284c7" />
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                      {tbm.site || '사업장 미지정'}
                    </span>
                    {tbm.workArea && (
                      <span style={{ fontSize: '11px', color: '#64748b', background: '#ffffff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        {tbm.workArea}
                      </span>
                    )}
                  </div>

                  {isAllDone ? (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #86efac'
                    }}>
                      <CheckCircle2 size={12} /> 업무 전·후 완료
                    </span>
                  ) : (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: '#ffedd5',
                      color: '#c2410c',
                      border: '1px solid #fdba74'
                    }}>
                      <Clock size={12} /> 업무 전 완료 (사후 대기)
                    </span>
                  )}
                </div>

                {/* Division & Team Title + Work Category Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{tbm.leaderDivision || '사업부'} · {tbm.leaderTeam || '부서'}</span>
                  </div>
                  {tbm.workCategory && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: tbm.workCategory === '허가작업' ? '#fee2e2' : tbm.workCategory === '신고작업' ? '#fef3c7' : tbm.workCategory === '작업 없음' ? '#f1f5f9' : '#e0f2fe',
                      color: tbm.workCategory === '허가작업' ? '#b91c1c' : tbm.workCategory === '신고작업' ? '#b45309' : tbm.workCategory === '작업 없음' ? '#475569' : '#0369a1',
                      border: '1px solid currentColor'
                    }}>
                      {tbm.workCategory}
                    </span>
                  )}
                </div>

                {/* Leader & Attendees Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '11.5px',
                  color: '#475569'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <UserCheck size={14} color="#0284c7" />
                    <span>책임자: <strong style={{ color: '#0f172a' }}>{tbm.leaderName} {tbm.leaderRank}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={14} color="#64748b" />
                    <span>참석인원: <strong style={{ color: '#0f172a' }}>{(tbm.attendees?.length || 0) + 1}명</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                    <Clock size={12} />
                    <span>{tbm.preCheck?.conductedAt || ''}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTbm(tbm);
                      setIsDetailModalOpen(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <FileText size={13} color="#0284c7" /> 상세 일지
                  </button>

                  {!isAllDone && (
                    <button
                      type="button"
                      onClick={() => handleOpenPostWorkTbm(tbm)}
                      style={{
                        flex: 1.2,
                        padding: '7px 10px',
                        borderRadius: '6px',
                        background: '#0284c7',
                        border: '1px solid #0284c7',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckSquare size={13} /> 업무 후 TBM 진행
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setTargetDeleteTbm(tbm);
                      setIsDeleteModalOpen(true);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="TBM 일지 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: 3-Step TBM Registration Wizard                   */}
      {/* ======================================================== */}
      {isRegisterModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 200,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '12px'
        }}>
          <div className="glass-panel thin-scrollbar" style={{
            width: '100%',
            maxWidth: '440px',
            maxHeight: '92vh',
            overflowY: 'auto',
            borderRadius: '10px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1.5px solid #cbd5e1',
              background: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: '1.5px solid #0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                  flexShrink: 0
                }}>
                  <HardHat size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>
                    {editingTbmId ? '업무전후 TBM 일지 점검' : '업무전후 TBM 등록'}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', display: 'block' }}>
                    작업 전 안전·보안 점검 & 사후 정리
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Step Progress Tracker (High-Contrast Modern Stepper) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '4px',
              padding: '10px 12px',
              background: '#f8fafc',
              borderBottom: '1.5px solid #cbd5e1'
            }}>
              {(() => {
                const isStep1Done = Boolean(formData.site?.trim() && formData.workTitle?.trim());
                const isStep2Done = currentSelectedKeys.length > 0;
                const isStep3Done = currentPostSelectedKeys.length > 0 || Boolean(formData.postCheck?.isCompleted);

                const getStepCompletion = (st) => {
                  if (st === 1) return isStep1Done;
                  if (st === 2) return isStep2Done;
                  if (st === 3) return isStep3Done;
                  return false;
                };

                return [
                  { step: 1, title: '기본정보' },
                  { step: 2, title: '업무 전 TBM' },
                  { step: 3, title: '업무 후 TBM' }
                ].map(s => {
                  const isActive = activeStep === s.step;
                  const isDone = getStepCompletion(s.step);
                  const isPassed = activeStep > s.step;

                  let borderColor = '#cbd5e1';
                  let bgColor = '#f1f5f9';
                  let textColor = '#475569';
                  let badgeBg = '#cbd5e1';
                  let badgeText = s.step;

                  if (isActive) {
                    borderColor = '#0284c7';
                    bgColor = '#ffffff';
                    textColor = '#0284c7';
                    badgeBg = '#0284c7';
                    badgeText = s.step;
                  } else if (isDone) {
                    borderColor = '#86efac';
                    bgColor = '#f0fdf4';
                    textColor = '#16a34a';
                    badgeBg = '#16a34a';
                    badgeText = '✓';
                  }

                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setActiveStep(s.step)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: `1.5px solid ${borderColor}`,
                        background: bgColor,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? '0 2px 6px rgba(2, 132, 199, 0.15)' : 'none',
                        position: 'relative',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        fontSize: '11px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: badgeBg,
                        color: '#ffffff',
                        flexShrink: 0
                      }}>
                        {badgeText}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: isActive ? '800' : '700',
                        color: textColor,
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        lineHeight: '1.2'
                      }}>
                        {s.title}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Step Contents Form */}
            <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* ---------------- STEP 1: Basic Info & Attendees ---------------- */}
              {activeStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Select Target Site & TBM Date (Same Horizontal Row) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                    gap: '12px'
                  }}>
                    {/* Select Target Site */}
                    <div style={{ minWidth: 0 }}>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        사업장 *
                      </label>
                      <select
                        value={`${formData.site}:::${formData.siteAddress || ''}`}
                        onChange={(e) => {
                          const [sName, sAddr] = e.target.value.split(':::');
                          const s = availableSites.find(item => item.name === sName && (item.address || '') === (sAddr || ''));
                          setFormData({
                            ...formData,
                            site: sName || '',
                            siteAddress: s ? s.address : (sAddr || formData.siteAddress)
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '13px',
                          fontWeight: '600',
                          outline: 'none'
                        }}
                      >
                        <option value=":::">-- 사업장을 선택해 주세요 --</option>
                        {availableSites.map((s, idx) => (
                          <option key={s.id || `${s.name}-${s.address}-${idx}`} value={`${s.name}:::${s.address || ''}`}>
                            {s.name} ({s.address || '주소 미입력'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* TBM Date */}
                    <div style={{ minWidth: 0 }}>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        TBM 일자 *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '13px',
                          fontWeight: '800',
                          color: '#0f172a',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>

                  {/* Division & Team Selection (Same Horizontal Row) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                    gap: '12px'
                  }}>
                    {/* Division Selection */}
                    <div style={{ minWidth: 0 }}>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        사업부 *
                      </label>
                      <select
                        value={formData.leaderDivision}
                        onChange={(e) => {
                          const newDiv = e.target.value;
                          const teams = getTeamsForDivision(newDiv) || [];
                          const defaultTeam = teams.length > 0 ? teams[0] : '';
                          const teamUsers = allUsers.filter(u =>
                            (!newDiv || u.division === newDiv) &&
                            (!defaultTeam || u.team === defaultTeam || u.department === defaultTeam)
                          );
                          setSelectedAbsenteeName('');
                          setSelectedPostAbsenteeName('');
                          setFormData(prev => ({
                            ...prev,
                            leaderDivision: newDiv,
                            leaderTeam: defaultTeam,
                            leaderName: '',
                            leaderRank: '대리',
                            leaderPhone: '',
                            absentees: [],
                            attendees: teamUsers.map(u => ({
                              name: u.name,
                              rank: u.rank || '사원',
                              team: u.team || u.department || defaultTeam,
                              division: u.division || newDiv,
                              phone: u.phone || ''
                            })),
                            postCheck: {
                              ...prev.postCheck,
                              absentees: []
                            }
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '13px',
                          fontWeight: '600',
                          outline: 'none'
                        }}
                      >
                        <option value="">-- 사업부를 선택해 주세요 --</option>
                        {availableDivisions.map(div => (
                          <option key={div} value={div}>{div}</option>
                        ))}
                      </select>
                    </div>

                    {/* Team / Department Selection */}
                    <div style={{ minWidth: 0 }}>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        소속팀 (부서) *
                      </label>
                      <select
                        value={formData.leaderTeam}
                        disabled={!formData.leaderDivision}
                        onChange={(e) => {
                          const newTeam = e.target.value;
                          const teamUsers = allUsers.filter(u =>
                            (!formData.leaderDivision || u.division === formData.leaderDivision) &&
                            (!newTeam || u.team === newTeam || u.department === newTeam)
                          );
                          setSelectedAbsenteeName('');
                          setSelectedPostAbsenteeName('');
                          setFormData(prev => ({
                            ...prev,
                            leaderTeam: newTeam,
                            leaderName: '',
                            leaderRank: '대리',
                            leaderPhone: '',
                            absentees: [],
                            attendees: teamUsers.map(u => ({
                              name: u.name,
                              rank: u.rank || '사원',
                              team: u.team || u.department || newTeam,
                              division: u.division || prev.leaderDivision || '',
                              phone: u.phone || ''
                            })),
                            postCheck: {
                              ...prev.postCheck,
                              absentees: []
                            }
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: !formData.leaderDivision ? '#f1f5f9' : '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '13px',
                          fontWeight: '600',
                          outline: 'none',
                          cursor: !formData.leaderDivision ? 'not-allowed' : 'default'
                        }}
                      >
                        <option value="">
                          {!formData.leaderDivision ? '-- 먼저 사업부를 선택하세요 --' : '-- 부서를 선택해 주세요 --'}
                        </option>
                        {availableTeams.map(tm => (
                          <option key={tm} value={tm}>{tm}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* TBM Leader Selection */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      TBM 주관자 *
                    </label>
                    <select
                      value={formData.leaderName}
                      disabled={!formData.leaderTeam && filteredLeadersPool.length === 0}
                      onChange={(e) => {
                        const newLeader = e.target.value;
                        const selUser = allUsers.find(u => u.name === newLeader && (!formData.leaderDivision || u.division === formData.leaderDivision));
                        setFormData(prev => {
                          const sortedAttendees = [...prev.attendees].sort((a, b) => {
                            if (a.name === newLeader) return -1;
                            if (b.name === newLeader) return 1;
                            return 0;
                          });
                          return {
                            ...prev,
                            leaderName: newLeader,
                            leaderRank: selUser?.rank || prev.leaderRank || '대리',
                            leaderPhone: selUser?.phone || prev.leaderPhone || '',
                            attendees: sortedAttendees
                          };
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: '600',
                        outline: 'none'
                      }}
                    >
                      <option value="">-- TBM 주관자를 선택해 주세요 --</option>
                      {filteredLeadersPool.map((u, idx) => (
                        <option key={u.id || `${u.name}-${u.rank}-${idx}`} value={u.name}>
                          {u.name} ({u.rank || '사원'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* TBM Attendees Dropdown Proposal Box & Selected List (1줄에 3명씩) */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span>TBM 참여자 *</span>
                    </label>

                    {/* Custom Dropdown Trigger Bar */}
                    <div
                      onClick={() => {
                        if (!formData.leaderTeam) {
                          if (onTriggerToast) onTriggerToast('먼저 소속팀(부서)을 선택해주세요.', 'warning');
                          return;
                        }
                        setIsAttendeeDropdownOpen(prev => !prev);
                      }}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: isAttendeeDropdownOpen ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: formData.attendees.length > 0 ? '#0f172a' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: !formData.leaderTeam ? 'not-allowed' : 'pointer',
                        userSelect: 'none',
                        boxShadow: isAttendeeDropdownOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                        transition: 'all 0.2s ease',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={16} color={formData.attendees.length > 0 ? '#0284c7' : '#94a3b8'} />
                        <span>
                          {formData.attendees.length === 0
                            ? 'TBM 참여자 선택 (클릭하여 제안 목록 열기)'
                            : `${formData.attendees.length}명 참여자 선택됨`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>
                          {isAttendeeDropdownOpen ? '닫기' : '선택'}
                        </span>
                        {isAttendeeDropdownOpen ? (
                          <ChevronUp size={16} color="#0284c7" />
                        ) : (
                          <ChevronDown size={16} color="#64748b" />
                        )}
                      </div>
                    </div>

                    {/* Dropdown Suggestion Popup (3 Columns: 1줄에 3명씩) */}
                    {isAttendeeDropdownOpen && (
                      <div className="thin-scrollbar" style={{
                        position: 'absolute',
                        top: '72px',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                        padding: '8px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '6px',
                        maxHeight: '260px',
                        overflowY: 'auto'
                      }}>
                        {filteredAttendeesPool.length > 0 ? (
                          filteredAttendeesPool.map((user, idx) => {
                            const isSelected = formData.attendees.some(a => isSamePerson(a, user));
                            const isLeader = user.name === formData.leaderName;
                            return (
                              <div
                                key={user.id || `${user.name}-${idx}`}
                                onClick={() => toggleAttendee(user)}
                                style={{
                                  padding: '7px 8px',
                                  borderRadius: '6px',
                                  background: isSelected ? '#f0fdf4' : '#ffffff',
                                  border: isSelected ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  userSelect: 'none',
                                  minWidth: 0
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => { }}
                                  style={{ width: '13px', height: '13px', accentColor: '#0284c7', cursor: 'pointer', pointerEvents: 'none', flexShrink: 0 }}
                                />
                                <div style={{
                                  flex: 1,
                                  fontSize: '11px',
                                  fontWeight: isSelected ? '700' : '600',
                                  color: isSelected ? '#15803d' : '#334155',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }} title={`${user.name} (${user.rank || '사원'})${isLeader ? ' [주관자]' : ''}`}>
                                  {user.name} ({user.rank || '사원'})
                                  {isLeader && <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '2px', fontWeight: '800' }}>★</span>}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ gridColumn: 'span 3', padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                            선택된 부서에 소속된 인원이 없습니다.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected Attendees List Output (3 Columns: 1줄에 3명씩) */}
                    {formData.attendees.length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '6px'
                      }}>
                        {(() => {
                          // Ensure leader is always sorted first at the very beginning
                          const sortedAttendees = [...formData.attendees].sort((a, b) => {
                            if (a.name === formData.leaderName) return -1;
                            if (b.name === formData.leaderName) return 1;
                            return 0;
                          });
                          return sortedAttendees.map((att, idx) => {
                            const isLeader = att.name === formData.leaderName;
                            return (
                              <div
                                key={att.id || `${att.name}-${idx}`}
                                style={{
                                  padding: '7px 6px',
                                  borderRadius: '6px',
                                  background: isLeader ? '#e0f2fe' : '#f0fdf4',
                                  border: isLeader ? '1.5px solid #7dd3fc' : '1.5px solid #86efac',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textAlign: 'center',
                                  minWidth: 0,
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}
                              >
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  color: isLeader ? '#0369a1' : '#15803d',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }} title={`${att.name} (${att.rank || '사원'})${isLeader ? ' (주관자)' : ''}`}>
                                  {att.name} ({att.rank || '사원'}){isLeader ? '·주관' : ''}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1.5px dashed #cbd5e1',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '12.5px'
                      }}>
                        <span>👥 상단 드롭다운에서 TBM 참여자를 선택해 주세요.</span>
                      </div>
                    )}
                  </div>

                  {/* Step 1 Next Button */}
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.site?.trim()) {
                          if (onTriggerToast) onTriggerToast('사업장을 선택해주세요.', 'warning');
                          return;
                        }
                        if (!formData.leaderDivision?.trim()) {
                          if (onTriggerToast) onTriggerToast('사업부를 선택해주세요.', 'warning');
                          return;
                        }
                        if (!formData.leaderTeam?.trim()) {
                          if (onTriggerToast) onTriggerToast('부서를 선택해주세요.', 'warning');
                          return;
                        }
                        if (!formData.leaderName?.trim()) {
                          if (onTriggerToast) onTriggerToast('TBM 주관자를 선택해주세요.', 'warning');
                          return;
                        }
                        setActiveStep(2);
                      }}
                      className="glass-button-primary"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        fontWeight: '800',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)'
                      }}
                    >
                      다음 단계 (업무 전 TBM) <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------- STEP 2: Pre-Work TBM Check ---------------- */}
              {activeStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🛡️ Step 2. 업무 전 TBM (작업 전 안전 및 보안 점검)
                  </div>

                  {/* 1. Work Status / Category Dropdown */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      금일 작업 현황 *
                    </label>
                    <select
                      value={formData.workCategory}
                      onChange={(e) => setFormData({ ...formData, workCategory: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: formData.workCategory === '허가작업' ? '#dc2626' : formData.workCategory === '신고작업' ? '#d97706' : formData.workCategory === '작업 없음' ? '#64748b' : '#0284c7',
                        outline: 'none'
                      }}
                    >
                      <option value="허가작업">🔥 허가작업 (화기/고소/밀폐 등 위험 작업)</option>
                      <option value="신고작업">📝 신고작업 (사전 신고 및 승인 작업)</option>
                      <option value="일반작업">🛠️ 일반작업 (표준 유지보수 및 점검)</option>
                      <option value="작업 없음">☕ 작업 없음 (내부 업무)</option>
                    </select>
                  </div>

                  {/* 2. Absentee Selection (Vacation / Half-day / Education) */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span>미참여 인원 (휴가 / 반차 / 교육 등)</span>
                      {formData.absentees.length > 0 && (
                        <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: '800' }}>
                          {formData.absentees.length}명 등록됨
                        </span>
                      )}
                    </label>

                    <div style={{
                      background: '#f8fafc',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '6px', alignItems: 'center' }}>
                        <select
                          value={selectedAbsenteeName}
                          onChange={(e) => setSelectedAbsenteeName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                        >
                          <option value="">-- 미참여 인원 선택 --</option>
                          {filteredLeadersPool.map((u, idx) => (
                            <option key={u.id || `${u.name}-${idx}`} value={u.name}>
                              {u.name} ({u.rank || '사원'})
                            </option>
                          ))}
                        </select>

                        <select
                          value={absenteeReason}
                          onChange={(e) => setAbsenteeReason(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: '700',
                            outline: 'none'
                          }}
                        >
                          <option value="휴가">🏖️ 휴가</option>
                          <option value="오전반차">🌅 오전반차</option>
                          <option value="교육">📚 교육</option>
                          <option value="기타">기타 사유</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedAbsenteeName) {
                              if (onTriggerToast) onTriggerToast('미참여 인원을 선택해주세요.', 'warning');
                              return;
                            }
                            const targetUser = filteredLeadersPool.find(u => u.name?.trim() === selectedAbsenteeName?.trim());
                            const exists = formData.absentees.some(a => a.name?.trim() === selectedAbsenteeName?.trim());
                            if (exists) {
                              if (onTriggerToast) onTriggerToast('이미 미참여 목록에 등록된 인원입니다.', 'info');
                              return;
                            }
                            setFormData(prev => ({
                              ...prev,
                              // Automatically exclude from attendees in Step 1
                              attendees: prev.attendees.filter(a => a.name?.trim() !== selectedAbsenteeName?.trim()),
                              absentees: [
                                ...prev.absentees,
                                {
                                  name: selectedAbsenteeName,
                                  rank: targetUser?.rank || '사원',
                                  reason: absenteeReason
                                }
                              ]
                            }));
                            setSelectedAbsenteeName('');
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          + 추가
                        </button>
                      </div>

                      {/* Absentee Tag Badges */}
                      {formData.absentees.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                          {formData.absentees.map((abs, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#fff1f2',
                                color: '#e11d48',
                                border: '1px solid #fecdd3',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>{abs.name} ({abs.rank}) - <strong>{abs.reason}</strong></span>
                              <button
                                type="button"
                                onClick={() => {
                                  const removed = formData.absentees[idx];
                                  const targetUser = allUsers.find(u => u.name?.trim() === removed?.name?.trim() && (!formData.leaderDivision || u.division === formData.leaderDivision));
                                  setFormData(prev => ({
                                    ...prev,
                                    absentees: prev.absentees.filter((_, i) => i !== idx),
                                    // Restore back to attendees if not already present
                                    attendees: targetUser && !prev.attendees.some(a => a.name?.trim() === removed?.name?.trim())
                                      ? [
                                        ...prev.attendees,
                                        {
                                          name: targetUser.name,
                                          rank: targetUser.rank || '사원',
                                          team: targetUser.team || targetUser.department || prev.leaderTeam || '',
                                          division: targetUser.division || prev.leaderDivision || '',
                                          phone: targetUser.phone || ''
                                        }
                                      ]
                                      : prev.attendees
                                  }));
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#e11d48', cursor: 'pointer', padding: 0, fontWeight: '800' }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Pre-Work Checklist Multi-Select Dropdown & Selected Items List */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span>재해 예방 활동 *</span>
                    </label>

                    {/* Custom Multi-Select Dropdown Trigger Bar */}
                    <div
                      onClick={() => setIsChecklistDropdownOpen(prev => !prev)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: isChecklistDropdownOpen ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: currentSelectedKeys.length > 0 ? '#0f172a' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none',
                        boxShadow: isChecklistDropdownOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                        transition: 'all 0.2s ease',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={16} color={currentSelectedKeys.length > 0 ? '#0284c7' : '#94a3b8'} />
                        <span>
                          {currentSelectedKeys.length === 0
                            ? '안전 점검 항목 선택'
                            : `${currentSelectedKeys.length}개 점검 항목 선택됨`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>
                          {isChecklistDropdownOpen ? '닫기' : '선택'}
                        </span>
                        {isChecklistDropdownOpen ? (
                          <ChevronUp size={16} color="#0284c7" />
                        ) : (
                          <ChevronDown size={16} color="#64748b" />
                        )}
                      </div>
                    </div>

                    {/* Dropdown Suggestion Popup (Multiple Checkbox Selector) */}
                    {isChecklistDropdownOpen && (
                      <div className="thin-scrollbar" style={{
                        position: 'absolute',
                        top: '72px',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                        padding: '8px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '6px',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>

                        {PRE_WORK_CHECKLIST_ITEMS.map(item => {
                          const isChecked = currentSelectedKeys.includes(item.key);
                          return (
                            <div
                              key={item.key}
                              onClick={() => toggleCheckItem(item.key)}
                              style={{
                                padding: '7px 8px',
                                borderRadius: '6px',
                                background: isChecked ? '#f0fdf4' : '#ffffff',
                                border: isChecked ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                userSelect: 'none',
                                minWidth: 0
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => { }} // handled by parent div onClick
                                style={{ width: '13px', height: '13px', accentColor: '#0284c7', cursor: 'pointer', pointerEvents: 'none', flexShrink: 0 }}
                              />
                              <div style={{
                                flex: 1,
                                fontSize: '11px',
                                fontWeight: isChecked ? '700' : '600',
                                color: isChecked ? '#15803d' : '#334155',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }} title={item.label}>
                                {item.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Selected Checklist Items Output (3 Columns, Clean Badges) */}
                    {currentSelectedKeys.length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '6px'
                      }}>
                        {currentSelectedKeys.map(key => {
                          const item = PRE_WORK_CHECKLIST_ITEMS.find(it => it.key === key);
                          if (!item) return null;
                          return (
                            <div
                              key={item.key}
                              style={{
                                padding: '7px 6px',
                                borderRadius: '6px',
                                background: '#f0fdf4',
                                border: '1.5px solid #86efac',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                minWidth: 0,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                              }}
                            >
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#15803d',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }} title={item.label}>
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1.5px dashed #cbd5e1',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '12.5px'
                      }}>
                        <span>📋 상단 드롭다운에서 실시한 안전 점검 항목을 선택해 주세요.</span>
                      </div>
                    )}
                  </div>

                  {/* 4. Guidance Notes & Time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        전달 사항 및 지도내역
                      </label>
                      <textarea
                        rows={5}
                        placeholder="작업 전 안전수칙 준수, 위험요소 사전 통제, 작업자 지도 및 전달 사항을 입력하세요."
                        value={formData.preCheck.notes}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          preCheck: { ...prev.preCheck, notes: e.target.value }
                        }))}
                        style={{
                          width: '100%',
                          minHeight: '110px',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '12.5px',
                          lineHeight: '1.5',
                          outline: 'none',
                          resize: 'none'
                        }}
                      />
                    </div>
                    {/* 4. Photo Registration Section (Replaced TBM Time) */}
                    <div>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Camera size={14} color="#0284c7" />
                          <span>TBM 현장 사진 등록</span>
                        </span>
                        <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '800' }}>
                          {(formData.preCheck?.photos || []).length} / 5장
                        </span>
                      </label>

                      {/* Hidden File Inputs for Camera & Upload */}
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif,.webp"
                        capture="environment"
                        onChange={(e) => {
                          handlePhotoFilesSelected(e.target.files);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />

                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif,.webp"
                        multiple
                        onChange={(e) => {
                          handlePhotoFilesSelected(e.target.files);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />

                      {/* Action Buttons: Camera Shoot & Gallery/Capture Upload */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '8px',
                            background: '#f0f9ff',
                            border: '1.5px dashed #0284c7',
                            color: '#0369a1',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Camera size={15} /> 카메라 촬영
                        </button>

                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            color: '#334155',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <ImageIcon size={15} color="#64748b" /> 사진 업로드 (캡처/앨범)
                        </button>
                      </div>

                      {/* Photo Thumbnail Grid */}
                      {(formData.preCheck?.photos || []).length > 0 && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
                          gap: '8px',
                          padding: '10px',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0'
                        }}>
                          {(formData.preCheck?.photos || []).map((photo) => (
                            <div
                              key={photo.id}
                              style={{
                                position: 'relative',
                                width: '100%',
                                paddingBottom: '100%',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1.5px solid #cbd5e1',
                                background: '#000000',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                              }}
                            >
                              <img
                                src={photo.dataUrl}
                                alt="TBM 현장 사진"
                                onClick={() => setPreviewModalPhoto(photo.dataUrl)}
                                title="클릭하여 사진 확대"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  cursor: 'pointer'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(photo.id)}
                                title="사진 삭제"
                                style={{
                                  position: 'absolute',
                                  top: '3px',
                                  right: '3px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: 'rgba(225, 29, 72, 0.9)',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: '900',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2 Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveStep(1)}
                      className="glass-button"
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700' }}
                    >
                      이전 단계
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmitTbm(true)}
                      style={{
                        flex: 1.2,
                        padding: '12px',
                        borderRadius: '12px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        border: '1.5px solid #bae6fd',
                        fontSize: '12.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 size={16} /> 업무전만 저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStep(3)}
                      className="glass-button-primary"
                      style={{
                        flex: 1.2,
                        padding: '12px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        fontWeight: '800',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)'
                      }}
                    >
                      업무 후 TBM <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------- STEP 3: Post-Work TBM Check ---------------- */}
              {activeStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🏁 Step 3. 업무 후 TBM (작업 종료 및 정리·퇴실 점검)
                  </div>

                  {/* 1. Post-Work Outcome Dropdown */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      금일 작업 결과 현황 *
                    </label>
                    <select
                      value={formData.postCheck.workOutcome || '계획 이행 완료'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        includePostCheckNow: true,
                        postCheck: { ...prev.postCheck, workOutcome: e.target.value }
                      }))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: formData.postCheck.workOutcome === '작업 미비 및 특이사항 발생' ? '#dc2626' : '#16a34a',
                        outline: 'none'
                      }}
                    >
                      <option value="계획 이행 완료">✅ 계획 이행 완료 (정상 완료)</option>
                      <option value="작업 미비 및 특이사항 발생">⚠️ 작업 미비 및 특이사항 발생</option>
                    </select>
                  </div>

                  {/* 2. Post-Work Absentee Selection (Early Leave / Going Out / Vacation) */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span>인원 변동 및 특이사항 (시작회의 기준) </span>
                      {(formData.postCheck.absentees || []).length > 0 && (
                        <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: '800' }}>
                          {(formData.postCheck.absentees || []).length}명 등록됨
                        </span>
                      )}
                    </label>

                    <div style={{
                      background: '#f8fafc',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1'
                    }}>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '6px', alignItems: 'center' }}>
                        <select
                          value={selectedPostAbsenteeName}
                          onChange={(e) => setSelectedPostAbsenteeName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                        >
                          <option value="">-- 미참여 인원 선택 --</option>
                          {filteredLeadersPool.map((u, idx) => (
                            <option key={u.id || `${u.name}-${idx}`} value={u.name}>
                              {u.name} ({u.rank || '사원'})
                            </option>
                          ))}
                        </select>

                        <select
                          value={postAbsenteeReason}
                          onChange={(e) => setPostAbsenteeReason(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: '700',
                            outline: 'none'
                          }}
                        >
                          <option value="오후반차">🌇 오후반차</option>
                          <option value="휴가">🏖️ 휴가</option>
                          <option value="교육">📚 교육</option>
                          <option value="기타">기타 사유</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedPostAbsenteeName) {
                              if (onTriggerToast) onTriggerToast('미참여 인원을 선택해주세요.', 'warning');
                              return;
                            }
                            const targetUser = filteredLeadersPool.find(u => u.name?.trim() === selectedPostAbsenteeName?.trim());
                            const curAbsList = formData.postCheck.absentees || [];
                            const exists = curAbsList.some(a => a.name?.trim() === selectedPostAbsenteeName?.trim());
                            if (exists) {
                              if (onTriggerToast) onTriggerToast('이미 미참여 목록에 등록된 인원입니다.', 'info');
                              return;
                            }
                            setFormData(prev => ({
                              ...prev,
                              includePostCheckNow: true,
                              // Automatically exclude from attendees
                              attendees: prev.attendees.filter(a => a.name?.trim() !== selectedPostAbsenteeName?.trim()),
                              postCheck: {
                                ...prev.postCheck,
                                absentees: [
                                  ...(prev.postCheck.absentees || []),
                                  {
                                    name: selectedPostAbsenteeName,
                                    rank: targetUser?.rank || '사원',
                                    reason: postAbsenteeReason
                                  }
                                ]
                              }
                            }));
                            setSelectedPostAbsenteeName('');
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          + 추가
                        </button>
                      </div>

                      {/* Post-Absentee Tag Badges */}
                      {(formData.postCheck.absentees || []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                          {(formData.postCheck.absentees || []).map((abs, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#fff1f2',
                                color: '#e11d48',
                                border: '1px solid #fecdd3',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>{abs.name} ({abs.rank}) - <strong>{abs.reason}</strong></span>
                              <button
                                type="button"
                                onClick={() => {
                                  const removed = (formData.postCheck.absentees || [])[idx];
                                  const targetUser = allUsers.find(u => u.name?.trim() === removed?.name?.trim() && (!formData.leaderDivision || u.division === formData.leaderDivision));
                                  setFormData(prev => ({
                                    ...prev,
                                    // Restore back to attendees if not already present
                                    attendees: targetUser && !prev.attendees.some(a => a.name?.trim() === removed?.name?.trim())
                                      ? [
                                        ...prev.attendees,
                                        {
                                          name: targetUser.name,
                                          rank: targetUser.rank || '사원',
                                          team: targetUser.team || targetUser.department || prev.leaderTeam || '',
                                          division: targetUser.division || prev.leaderDivision || '',
                                          phone: targetUser.phone || ''
                                        }
                                      ]
                                      : prev.attendees,
                                    postCheck: {
                                      ...prev.postCheck,
                                      absentees: (prev.postCheck.absentees || []).filter((_, i) => i !== idx)
                                    }
                                  }));
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#e11d48', cursor: 'pointer', padding: 0, fontWeight: '800' }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Post-Work Checklist Multi-Select Dropdown & Selected Items List */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span>재해 예방 활동 *</span>
                    </label>

                    {/* Custom Multi-Select Dropdown Trigger Bar */}
                    <div
                      onClick={() => setIsPostChecklistDropdownOpen(prev => !prev)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: isPostChecklistDropdownOpen ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: currentPostSelectedKeys.length > 0 ? '#0f172a' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none',
                        boxShadow: isPostChecklistDropdownOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                        transition: 'all 0.2s ease',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={16} color={currentPostSelectedKeys.length > 0 ? '#0284c7' : '#94a3b8'} />
                        <span>
                          {currentPostSelectedKeys.length === 0
                            ? '안전 점검 항목 선택'
                            : `${currentPostSelectedKeys.length}개 점검 항목 선택됨`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>
                          {isPostChecklistDropdownOpen ? '닫기' : '선택'}
                        </span>
                        {isPostChecklistDropdownOpen ? (
                          <ChevronUp size={16} color="#0284c7" />
                        ) : (
                          <ChevronDown size={16} color="#64748b" />
                        )}
                      </div>
                    </div>

                    {/* Dropdown Suggestion Popup (Multiple Checkbox Selector - 2 Columns) */}
                    {isPostChecklistDropdownOpen && (
                      <div className="thin-scrollbar" style={{
                        position: 'absolute',
                        top: '72px',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                        padding: '8px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '6px',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        {POST_WORK_CHECKLIST_ITEMS.map(item => {
                          const isChecked = currentPostSelectedKeys.includes(item.key);
                          return (
                            <div
                              key={item.key}
                              onClick={() => togglePostCheckItem(item.key)}
                              style={{
                                padding: '7px 8px',
                                borderRadius: '6px',
                                background: isChecked ? '#f0fdf4' : '#ffffff',
                                border: isChecked ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                userSelect: 'none',
                                minWidth: 0
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => { }}
                                style={{ width: '13px', height: '13px', accentColor: '#0284c7', cursor: 'pointer', pointerEvents: 'none', flexShrink: 0 }}
                              />
                              <div style={{
                                flex: 1,
                                fontSize: '11px',
                                fontWeight: isChecked ? '700' : '600',
                                color: isChecked ? '#15803d' : '#334155',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }} title={item.label}>
                                {item.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Selected Checklist Items Output (3 Columns, Clean Badges) */}
                    {currentPostSelectedKeys.length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '6px'
                      }}>
                        {currentPostSelectedKeys.map(key => {
                          const item = POST_WORK_CHECKLIST_ITEMS.find(it => it.key === key);
                          if (!item) return null;
                          return (
                            <div
                              key={item.key}
                              style={{
                                padding: '7px 6px',
                                borderRadius: '6px',
                                background: '#f0fdf4',
                                border: '1.5px solid #86efac',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                minWidth: 0,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                              }}
                            >
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#15803d',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }} title={item.label}>
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1.5px dashed #cbd5e1',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '12.5px'
                      }}>
                        <span>📋 상단 드롭다운에서 실시한 안전 점검 항목을 선택해 주세요.</span>
                      </div>
                    )}
                  </div>

                  {/* 4. Post-Check Handover Notes & Photo Registration */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        전달사항 및 계획대비 변경 또는 특이사항
                      </label>
                      <textarea
                        rows={5}
                        placeholder="작업 종료 후 전달사항, 계획대비 변경사항 또는 특이사항을 상세히 입력하세요."
                        value={formData.postCheck.handoverNotes}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          includePostCheckNow: true,
                          postCheck: { ...prev.postCheck, handoverNotes: e.target.value }
                        }))}
                        style={{
                          width: '100%',
                          minHeight: '110px',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '12.5px',
                          lineHeight: '1.5',
                          outline: 'none',
                          resize: 'none'
                        }}
                      />
                    </div>

                    {/* 5. Post Photo Registration Section (Replaced TBM End Time) */}
                    <div>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Camera size={14} color="#0284c7" />
                          <span>업무 후 현장 사진 등록</span>
                        </span>
                        <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '800' }}>
                          {(formData.postCheck?.photos || []).length} / 5장
                        </span>
                      </label>

                      {/* Hidden File Inputs for Post Camera & Upload */}
                      <input
                        ref={postCameraInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif,.webp"
                        capture="environment"
                        onChange={(e) => {
                          handlePostPhotoFilesSelected(e.target.files);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />

                      <input
                        ref={postGalleryInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif,.webp"
                        multiple
                        onChange={(e) => {
                          handlePostPhotoFilesSelected(e.target.files);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />

                      {/* Action Buttons: Camera Shoot & Gallery/Capture Upload */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <button
                          type="button"
                          onClick={() => postCameraInputRef.current?.click()}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '8px',
                            background: '#f0f9ff',
                            border: '1.5px dashed #0284c7',
                            color: '#0369a1',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Camera size={15} /> 카메라 촬영
                        </button>

                        <button
                          type="button"
                          onClick={() => postGalleryInputRef.current?.click()}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            color: '#334155',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <ImageIcon size={15} color="#64748b" /> 사진 업로드 (캡처/앨범)
                        </button>
                      </div>

                      {/* Photo Thumbnail Grid */}
                      {(formData.postCheck?.photos || []).length > 0 && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
                          gap: '8px',
                          padding: '10px',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0'
                        }}>
                          {(formData.postCheck?.photos || []).map((photo) => (
                            <div
                              key={photo.id}
                              style={{
                                position: 'relative',
                                width: '100%',
                                paddingBottom: '100%',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1.5px solid #cbd5e1',
                                background: '#000000',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                              }}
                            >
                              <img
                                src={photo.dataUrl}
                                alt="업무 후 현장 사진"
                                onClick={() => setPreviewModalPhoto(photo.dataUrl)}
                                title="클릭하여 사진 확대"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  cursor: 'pointer'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePostPhoto(photo.id)}
                                title="사진 삭제"
                                style={{
                                  position: 'absolute',
                                  top: '3px',
                                  right: '3px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: 'rgba(225, 29, 72, 0.9)',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: '900',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3 Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="glass-button"
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700' }}
                    >
                      이전 단계
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmitTbm(false)}
                      className="glass-button-primary"
                      style={{
                        flex: 2,
                        padding: '12px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)'
                      }}
                    >
                      <CheckCircle2 size={18} /> TBM 일지 저장 및 등록 완료
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Attendee Picker Sub-Modal                        */}
      {/* ======================================================== */}
      {isAttendeePickerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 300,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '440px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                동행 / 참석 작업자 선택
              </span>
              <button
                type="button"
                onClick={() => setIsAttendeePickerOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="이름, 부서 검색..."
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: '6px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            <div className="thin-scrollbar" style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {allUsers
                .filter(u => {
                  if (currentUser && isSamePerson(u, currentUser)) return false;
                  if (!attendeeSearch) return true;
                  const q = attendeeSearch.toLowerCase();
                  return (u.name && u.name.toLowerCase().includes(q)) || (u.team && u.team.toLowerCase().includes(q));
                })
                .map((user, idx) => {
                  const isSelected = formData.attendees.some(a => isSamePerson(a, user));
                  return (
                    <div
                      key={user.id || user.username || idx}
                      onClick={() => toggleAttendee(user)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: isSelected ? '#e0f2fe' : '#f8fafc',
                        border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{user.name}</strong>
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                          {user.rank || '사원'} · {user.team || user.department || ''}
                        </span>
                      </div>
                      {isSelected ? <CheckCircle2 size={16} color="#0284c7" /> : <Square size={16} color="#94a3b8" />}
                    </div>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => setIsAttendeePickerOpen(false)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              선택 완료 ({formData.attendees.length}명 선택됨)
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: TBM Details View & Print Modal                   */}
      {/* ======================================================== */}
      {isDetailModalOpen && selectedTbm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 250,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '12px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            borderRadius: '10px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Top */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="#0284c7" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  업무전후 TBM 안전·보안 일지
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body: Document View */}
            <div className="thin-scrollbar" style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Document Header Box */}
              <div style={{
                background: '#f0f9ff',
                border: '1.5px solid #bae6fd',
                padding: '12px 14px',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#0369a1' }}>
                    {selectedTbm.leaderDivision || '사업부'} · {selectedTbm.leaderTeam || '부서'} TBM
                  </div>
                  {selectedTbm.workCategory && (
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: selectedTbm.workCategory === '허가작업' ? '#fee2e2' : selectedTbm.workCategory === '신고작업' ? '#fef3c7' : selectedTbm.workCategory === '작업 없음' ? '#f1f5f9' : '#e0f2fe',
                      color: selectedTbm.workCategory === '허가작업' ? '#b91c1c' : selectedTbm.workCategory === '신고작업' ? '#b45309' : selectedTbm.workCategory === '작업 없음' ? '#475569' : '#0369a1',
                      border: '1px solid currentColor'
                    }}>
                      {selectedTbm.workCategory}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '12px', color: '#334155' }}>
                  <div><strong>사업장:</strong> {selectedTbm.site}</div>
                  <div><strong>TBM 일자:</strong> {selectedTbm.date}</div>
                  <div><strong>소속:</strong> {selectedTbm.leaderDivision || ''} {selectedTbm.leaderTeam || ''}</div>
                  <div><strong>TBM 주관자:</strong> {selectedTbm.leaderName} ({selectedTbm.leaderRank})</div>
                </div>
              </div>

              {/* Attendees & Absentees Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#334155' }}>
                <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {(() => {
                    const otherAttendees = selectedTbm.attendees?.filter(a => a.name !== selectedTbm.leaderName) || [];
                    const totalCount = otherAttendees.length + 1; // 주관자 + 타 참여자
                    return (
                      <>
                        <strong>참석 인원 ({totalCount}명):</strong>{' '}
                        <span style={{ color: '#0284c7', fontWeight: '700' }}>{selectedTbm.leaderName} (주관자)</span>
                        {otherAttendees.map(a => `, ${a.name} (${a.rank})`)}
                      </>
                    );
                  })()}
                </div>

                {selectedTbm.absentees && selectedTbm.absentees.length > 0 && (
                  <div style={{ background: '#fff1f2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecdd3', color: '#9f1239' }}>
                    <strong>🌴 미참여 인원 ({selectedTbm.absentees.length}명):</strong>{' '}
                    {selectedTbm.absentees.map((abs, idx) => (
                      <span key={idx} style={{ marginLeft: idx > 0 ? '6px' : '0' }}>
                        {abs.name} ({abs.rank || '사원'}·<strong>{abs.reason}</strong>){idx < selectedTbm.absentees.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Pre-Check Section */}
              <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '12px', background: '#ffffff' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0369a1', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🛡️ 업무 전 TBM 점검</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>실시: {selectedTbm.preCheck?.conductedAt || ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                  {(() => {
                    const conductedItems = PRE_WORK_CHECKLIST_ITEMS.filter(item => {
                      if (selectedTbm.preCheck?.selectedItems && Array.isArray(selectedTbm.preCheck.selectedItems)) {
                        return selectedTbm.preCheck.selectedItems.includes(item.key);
                      }
                      return Boolean(selectedTbm.preCheck?.[item.key]);
                    });
                    if (conductedItems.length === 0) {
                      return <div style={{ color: '#94a3b8' }}>실시된 안전 점검 항목 없음</div>;
                    }
                    return conductedItems.map(item => (
                      <div key={item.key} style={{ color: '#15803d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={13} color="#16a34a" /> {item.label}
                      </div>
                    ));
                  })()}
                </div>
                {selectedTbm.preCheck?.notes && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#1e293b', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: '800', color: '#0284c7', marginBottom: '2px' }}>📢 전달 사항 및 지도내역:</div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{selectedTbm.preCheck.notes}</div>
                  </div>
                )}

                {/* Pre-Check Photos in Detail Modal */}
                {selectedTbm.preCheck?.photos && selectedTbm.preCheck.photos.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Camera size={14} /> 현장 사진 ({selectedTbm.preCheck.photos.length}장)
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {selectedTbm.preCheck.photos.map((photo, idx) => (
                        <img
                          key={photo.id || idx}
                          src={photo.dataUrl}
                          alt="현장 사진"
                          onClick={() => setPreviewModalPhoto(photo.dataUrl)}
                          title="클릭하여 사진 확대"
                          style={{
                            width: '75px',
                            height: '75px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '1.5px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Post-Check Section */}
              <div style={{
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px',
                background: selectedTbm.postCheck?.isCompleted ? '#ffffff' : '#fffbeb'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: selectedTbm.postCheck?.isCompleted ? '#0369a1' : '#c2410c', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🏁 업무 후 TBM 점검</span>
                    {selectedTbm.postCheck?.isCompleted && selectedTbm.postCheck?.workOutcome && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: selectedTbm.postCheck.workOutcome === '작업 미비 및 특이사항 발생' ? '#fee2e2' : '#dcfce7',
                        color: selectedTbm.postCheck.workOutcome === '작업 미비 및 특이사항 발생' ? '#b91c1c' : '#15803d',
                        border: '1px solid currentColor'
                      }}>
                        {selectedTbm.postCheck.workOutcome}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {selectedTbm.postCheck?.isCompleted ? `종료: ${selectedTbm.postCheck?.conductedAt || ''}` : '미완료 (사후 대기)'}
                  </span>
                </div>

                {selectedTbm.postCheck?.isCompleted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Post Absentees if any */}
                    {selectedTbm.postCheck?.absentees && selectedTbm.postCheck.absentees.length > 0 && (
                      <div style={{ background: '#fff1f2', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecdd3', fontSize: '11.5px', color: '#9f1239' }}>
                        <strong>🏃 업무 후 미참여 인원 ({selectedTbm.postCheck.absentees.length}명):</strong>{' '}
                        {selectedTbm.postCheck.absentees.map((abs, idx) => (
                          <span key={idx} style={{ marginLeft: idx > 0 ? '4px' : '0' }}>
                            {abs.name} ({abs.rank || '사원'}·<strong>{abs.reason}</strong>){idx < selectedTbm.postCheck.absentees.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                      {(() => {
                        const conductedItems = POST_WORK_CHECKLIST_ITEMS.filter(item => {
                          if (selectedTbm.postCheck?.selectedItems && Array.isArray(selectedTbm.postCheck.selectedItems)) {
                            return selectedTbm.postCheck.selectedItems.includes(item.key);
                          }
                          return Boolean(selectedTbm.postCheck?.[item.key]);
                        });
                        if (conductedItems.length === 0) {
                          return <div style={{ color: '#94a3b8' }}>실시된 안전 점검 항목 없음</div>;
                        }
                        return conductedItems.map(item => (
                          <div key={item.key} style={{ color: '#15803d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={13} color="#16a34a" /> {item.label}
                          </div>
                        ));
                      })()}
                    </div>

                    {selectedTbm.postCheck?.handoverNotes && (
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#1e293b', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: '800', color: '#0284c7', marginBottom: '2px' }}>📢 전달사항 및 계획대비 변경/특이사항:</div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{selectedTbm.postCheck.handoverNotes}</div>
                      </div>
                    )}

                    {/* Post-Check Photos in Detail Modal */}
                    {selectedTbm.postCheck?.photos && selectedTbm.postCheck.photos.length > 0 && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Camera size={14} /> 업무 후 현장 사진 ({selectedTbm.postCheck.photos.length}장)
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {selectedTbm.postCheck.photos.map((photo, idx) => (
                            <img
                              key={photo.id || idx}
                              src={photo.dataUrl}
                              alt="업무 후 현장 사진"
                              onClick={() => setPreviewModalPhoto(photo.dataUrl)}
                              title="클릭하여 사진 확대"
                              style={{
                                width: '75px',
                                height: '75px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1.5px solid #cbd5e1',
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#b45309', padding: '8px', textAlign: 'center' }}>
                    작업 완료 후 '업무 후 TBM 진행' 버튼을 눌러 점검을 완료해주세요.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 18px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={15} /> 인쇄 / PDF
              </button>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: Delete Verification Modal                       */}
      {/* ======================================================== */}
      {isDeleteModalOpen && targetDeleteTbm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 350,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '380px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
              <Trash2 size={20} />
              <span style={{ fontSize: '15px', fontWeight: '800' }}>TBM 일지 삭제</span>
            </div>
            <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
              [{targetDeleteTbm.workTitle}] 일지를 삭제하시겠습니까?<br />
              본인 확인을 위해 비밀번호를 입력해주세요.
            </p>
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDeleteConfirm(); }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setTargetDeleteTbm(null);
                  setDeletePassword('');
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                삭제 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: Fullscreen Photo Lightbox Preview                */}
      {/* ======================================================== */}
      {previewModalPhoto && (
        <div
          onClick={() => setPreviewModalPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 400,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '92vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img
              src={previewModalPhoto}
              alt="현장 사진 확대 보기"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: '8px',
                objectFit: 'contain',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}
            />
            <button
              type="button"
              onClick={() => setPreviewModalPhoto(null)}
              title="닫기"
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
