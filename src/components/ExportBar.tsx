import { RefObject, useState } from 'react';
import { toPng } from 'html-to-image';

interface Props {
  targetRef: RefObject<HTMLElement>;
}

export default function ExportBar({ targetRef }: Props) {
  const [busy, setBusy] = useState(false);

  const handlePrint = () => window.print();

  const handlePng = async () => {
    if (!targetRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(targetRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.download = `알파학원_로드맵_시간표_${stamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('이미지 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="export-bar no-print">
      <span className="export-title">최종본 내보내기</span>
      <button onClick={handlePrint}>🖨 인쇄 / PDF</button>
      <button onClick={handlePng} disabled={busy}>
        {busy ? '저장 중…' : '🖼 이미지(PNG) 저장'}
      </button>
    </div>
  );
}
