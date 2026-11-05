import React, { useState } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

/**
 * 💬 일일/주간 업무 보고 피드백 댓글
 * - 공유받은 사람: 보고서에 피드백 작성
 * - 작성자: 받은 피드백 확인 및 답글 작성
 * - 본인이 작성한 댓글만 삭제 가능
 */
export default function ReportComments({
  comments = [],
  currentUser,
  onAdd,
  onDelete,
  placeholder = '피드백을 입력하세요',
  compact = false
}) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const list = Array.isArray(comments) ? comments : [];
  const myUsername = String(currentUser?.username || '').trim().toLowerCase();

  const handleSubmit = async () => {
    const body = text.trim();
    if (!body || isSubmitting || !onAdd) return;
    setIsSubmitting(true);
    try {
      await onAdd(body);
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd + Enter 로 바로 등록 (Enter 단독은 줄바꿈)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        marginTop: compact ? '8px' : '10px',
        borderTop: '1px dashed #cbd5e1',
        paddingTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '800', color: '#334155' }}>
        <MessageSquare size={13} color="#2563eb" />
        <span>피드백</span>
        {list.length > 0 && (
          <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '10px', padding: '0 7px', fontSize: '11px' }}>
            {list.length}
          </span>
        )}
      </div>

      {list.map(c => {
        const norm = (v) => String(v || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        const isMine = Boolean(
          (myUsername && c.author_username && String(c.author_username).trim().toLowerCase() === myUsername) ||
          (currentUser && norm(c.author_name) && norm(c.author_name) === norm(currentUser.name) &&
            norm(c.author_rank) === norm(currentUser.rank) &&
            (!norm(c.author_team) || norm(c.author_team) === norm(currentUser.team || currentUser.department)))
        );
        const authorLabel = [c.author_name, c.author_rank].filter(Boolean).join(' ') || c.author_username || '작성자';
        return (
          <div
            key={c.id}
            style={{
              background: isMine ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${isMine ? '#bfdbfe' : '#e2e8f0'}`,
              borderRadius: '6px',
              padding: '6px 8px',
              opacity: c._pending ? 0.75 : 1
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a' }}>
                {authorLabel}
                {c.author_team && <span style={{ fontWeight: '600', color: '#64748b' }}> ({c.author_team})</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  {c._pending ? '전송 중...' : c.created_at}
                </span>
                {isMine && onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('이 피드백을 삭제할까요?')) onDelete(c);
                    }}
                    title="내 피드백 삭제"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: '#94a3b8' }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: '12.5px', color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '3px', lineHeight: 1.5 }}>
              {c.text}
            </div>
          </div>
        );
      })}

      {onAdd && currentUser && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
          <textarea
            spellCheck={false}
            autoCorrect="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            maxLength={2000}
            style={{
              flex: 1,
              minHeight: '34px',
              maxHeight: '120px',
              resize: 'vertical',
              border: '1.5px solid #cbd5e1',
              borderRadius: '6px',
              padding: '7px 9px',
              fontSize: '12.5px',
              fontFamily: 'inherit',
              outline: 'none',
              background: '#ffffff'
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
            title="피드백 등록 (Ctrl+Enter)"
            style={{
              height: '34px',
              padding: '0 12px',
              borderRadius: '6px',
              border: 'none',
              background: text.trim() && !isSubmitting ? '#1e3a8a' : '#cbd5e1',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '800',
              cursor: text.trim() && !isSubmitting ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <Send size={12} />
            등록
          </button>
        </div>
      )}
    </div>
  );
}
