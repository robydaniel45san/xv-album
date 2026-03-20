import { useState, useRef, useCallback } from 'react';
import Head from 'next/head';

const EVENT   = 'Mis XV Años · Yeili Arianne';
const MAXPX   = 1920;
const QUALITY = 0.82;

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > MAXPX || h > MAXPX) {
        if (w > h) { h = Math.round(h * MAXPX / w); w = MAXPX; }
        else       { w = Math.round(w * MAXPX / h); h = MAXPX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, file.type === 'image/png' ? 'image/png' : 'image/jpeg', QUALITY);
    };
    img.src = url;
  });
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function Home() {
  const [guest,    setGuest]    = useState('');
  const [files,    setFiles]    = useState([]);   // { file, preview, status, error }
  const [uploading, setUploading] = useState(false);
  const [done,     setDone]     = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const addFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    if (!valid.length) return;
    setDone(false);
    const entries = valid.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      status: 'pending',
      error: null,
    }));
    setFiles(prev => [...prev, ...entries]);
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => {
    setFiles(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadAll = async () => {
    if (!files.length) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'ok') continue;

      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'loading' } : f));

      try {
        const compressed = await compressImage(files[i].file);
        const base64     = await toBase64(compressed);

        const res  = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: files[i].file.name,
            fileType: files[i].file.type,
            base64,
            guest: guest.trim() || null,
          }),
        });
        const data = await res.json();

        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: data.ok ? 'ok' : 'error', error: data.error || null } : f
        ));
      } catch (err) {
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'error', error: err.message } : f
        ));
      }
    }

    setUploading(false);
    setDone(true);
  };

  const allOk   = files.length > 0 && files.every(f => f.status === 'ok');
  const pending = files.filter(f => f.status === 'pending' || f.status === 'error').length;

  return (
    <>
      <Head>
        <title>{EVENT} – Álbum de fotos</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Lato', sans-serif;
          background: linear-gradient(160deg, #1a0a10 0%, #2d1020 40%, #1a0a10 100%);
          min-height: 100vh;
          color: #f5e6d3;
        }
        .page { max-width: 520px; margin: 0 auto; padding: 24px 16px 48px; }

        /* ── Header ── */
        .header { text-align: center; padding: 32px 0 24px; }
        .crown  { font-size: 2.8rem; line-height: 1; margin-bottom: 8px; }
        .title  {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem; font-weight: 600; letter-spacing: 1px;
          background: linear-gradient(135deg, #f0c070, #e8a0b0, #f0c070);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .subtitle {
          font-size: 0.85rem; font-weight: 300; letter-spacing: 3px;
          text-transform: uppercase; color: #c9a0a0; margin-top: 6px;
        }
        .divider {
          width: 80px; height: 1px; margin: 16px auto 0;
          background: linear-gradient(90deg, transparent, #d4a0b0, transparent);
        }

        /* ── Card ── */
        .card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(240,192,112,0.2);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 16px;
          backdrop-filter: blur(10px);
        }
        .card-label {
          font-size: 0.7rem; letter-spacing: 3px; text-transform: uppercase;
          color: #d4a0b0; margin-bottom: 8px;
        }
        input[type="text"] {
          width: 100%; background: rgba(255,255,255,0.08);
          border: 1px solid rgba(240,192,112,0.3); border-radius: 10px;
          padding: 12px 16px; color: #f5e6d3; font-size: 0.95rem;
          font-family: 'Lato', sans-serif; outline: none; transition: border .2s;
        }
        input[type="text"]::placeholder { color: #8a7070; }
        input[type="text"]:focus { border-color: rgba(240,192,112,0.7); }

        /* ── Drop zone ── */
        .dropzone {
          border: 2px dashed rgba(240,192,112,0.35);
          border-radius: 16px; padding: 36px 20px;
          text-align: center; cursor: pointer;
          transition: all .25s; position: relative;
          background: rgba(255,255,255,0.03);
        }
        .dropzone.over { border-color: #f0c070; background: rgba(240,192,112,0.07); }
        .dropzone:hover { border-color: rgba(240,192,112,0.6); }
        .drop-icon { font-size: 2.4rem; margin-bottom: 10px; }
        .drop-text { font-size: 0.95rem; color: #c9a0a0; line-height: 1.6; }
        .drop-text span { color: #f0c070; text-decoration: underline; cursor: pointer; }
        .drop-hint { font-size: 0.75rem; color: #8a6060; margin-top: 6px; }
        input[type="file"] { display: none; }

        /* ── Previews ── */
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
        .thumb {
          position: relative; aspect-ratio: 1;
          border-radius: 10px; overflow: hidden;
          background: rgba(0,0,0,.3);
        }
        .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .thumb-over {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem;
        }
        .thumb-over.loading { background: rgba(0,0,0,.45); }
        .thumb-over.ok      { background: rgba(0,100,0,.35); }
        .thumb-over.error   { background: rgba(150,0,0,.45); }
        .thumb-del {
          position: absolute; top: 4px; right: 4px;
          background: rgba(0,0,0,.6); border: none; color: #fff;
          width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
          font-size: 0.75rem; display: flex; align-items: center; justify-content: center;
        }
        .thumb-del:hover { background: rgba(180,40,40,.8); }

        /* ── Button ── */
        .btn {
          width: 100%; padding: 16px;
          background: linear-gradient(135deg, #c9607a, #e8a860);
          border: none; border-radius: 14px; color: #fff;
          font-size: 1rem; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; cursor: pointer;
          transition: opacity .2s, transform .1s; margin-top: 8px;
        }
        .btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .btn:active:not(:disabled) { transform: translateY(0); }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Success ── */
        .success {
          text-align: center; padding: 32px 20px;
          animation: popIn .4s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes popIn { from { transform: scale(.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .success-icon { font-size: 3.5rem; margin-bottom: 12px; }
        .success-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.6rem; font-weight: 600; color: #f0c070;
        }
        .success-sub { font-size: 0.9rem; color: #c9a0a0; margin-top: 8px; line-height: 1.6; }
        .btn-more {
          margin-top: 20px; padding: 12px 32px; width: auto; display: inline-block;
          font-size: 0.85rem;
        }

        /* ── Footer ── */
        .footer { text-align: center; font-size: 0.72rem; color: #6a5050; margin-top: 32px; letter-spacing: 1px; }
      `}</style>

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="crown">👑</div>
          <h1 className="title">Yeili Arianne</h1>
          <p className="subtitle">Mis XV Años · Álbum de Recuerdos</p>
          <div className="divider" />
        </div>

        {allOk && done ? (
          /* ── Success screen ── */
          <div className="card">
            <div className="success">
              <div className="success-icon">🌸</div>
              <p className="success-title">¡Gracias por compartir!</p>
              <p className="success-sub">
                Tus fotos ya están guardadas en el álbum de<br />
                <strong style={{ color: '#f0c070' }}>Yeili Arianne</strong> 💕<br /><br />
                Cada recuerdo es un regalo muy especial.
              </p>
              <button className="btn btn-more" onClick={() => { setFiles([]); setDone(false); }}>
                📷 Subir más fotos
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Name */}
            <div className="card">
              <p className="card-label">Tu nombre (opcional)</p>
              <input
                type="text"
                placeholder="¿Cómo te llamas? 🌸"
                value={guest}
                onChange={e => setGuest(e.target.value)}
                disabled={uploading}
              />
            </div>

            {/* Drop zone */}
            <div className="card">
              <p className="card-label">Tus fotos</p>
              <div
                className={`dropzone${dragging ? ' over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current.click()}
              >
                <div className="drop-icon">📸</div>
                <p className="drop-text">
                  Arrastra tus fotos aquí<br />
                  o <span>selecciona desde tu galería</span>
                </p>
                <p className="drop-hint">JPG, PNG, HEIC · Múltiples a la vez</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => addFiles(e.target.files)}
                />
              </div>

              {/* Thumbnails */}
              {files.length > 0 && (
                <div className="grid">
                  {files.map((f, i) => (
                    <div className="thumb" key={i}>
                      <img src={f.preview} alt="" />
                      {f.status === 'loading' && <div className="thumb-over loading">⏳</div>}
                      {f.status === 'ok'      && <div className="thumb-over ok">✅</div>}
                      {f.status === 'error'   && <div className="thumb-over error" title={f.error}>❌</div>}
                      {!uploading && f.status !== 'ok' && (
                        <button className="thumb-del" onClick={() => removeFile(i)}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload button */}
            {files.length > 0 && (
              <button
                className="btn"
                disabled={uploading || pending === 0}
                onClick={uploadAll}
              >
                {uploading
                  ? `⏳ Subiendo... (${files.filter(f => f.status === 'ok').length}/${files.length})`
                  : `💌 Enviar ${pending} foto${pending !== 1 ? 's' : ''} al álbum`
                }
              </button>
            )}
          </>
        )}

        <p className="footer">💕 Con amor para Yeili Arianne · Mis XV Años</p>
      </div>
    </>
  );
}
