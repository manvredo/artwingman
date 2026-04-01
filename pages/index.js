import { useRef, useState, useCallback } from 'react'
import { rgbToMunsell, chromaDescription, valueDescription, samplePixels } from '../lib/munsell'
import styles from '../styles/Home.module.css'

export default function Home() {
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const [image, setImage] = useState(null)
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 })
  const [color, setColor] = useState(null)
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false })
  const [sampleRadius, setSampleRadius] = useState(3)
  const [dragging, setDragging] = useState(false)

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setImage(img)
        setImgDims({ w: img.width, h: img.height })
        setColor(null)
        setTimeout(() => {
          const canvas = canvasRef.current
          if (canvas) {
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(img, 0, 0)
          }
        }, 50)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    loadFile(e.dataTransfer.files[0])
  }, [loadFile])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const scaleX = imgDims.w / rect.width
    const scaleY = imgDims.h / rect.height
    const px = Math.floor(sx * scaleX)
    const py = Math.floor(sy * scaleY)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imageData = ctx.getImageData(0, 0, imgDims.w, imgDims.h)
    const { r, g, b } = samplePixels(imageData, px, py, sampleRadius, imgDims.w, imgDims.h)
    const munsell = rgbToMunsell(r, g, b)
    setColor({ r, g, b, ...munsell })
  }, [imgDims, sampleRadius])

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true })
  }, [])

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>AW</span>
          <div>
            <div className={styles.logoName}>ArtWingman</div>
            <div className={styles.logoSub}>Color Analyzer</div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Sample Radius</div>
          <div className={styles.sliderRow}>
            <input
              type="range" min="1" max="20" value={sampleRadius}
              onChange={e => setSampleRadius(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.sliderVal}>{sampleRadius}px</span>
          </div>
        </div>

        {color ? (
          <div className={styles.colorPanel}>
            <div className={styles.swatch} style={{ background: `rgb(${color.r},${color.g},${color.b})` }} />
            <div className={styles.rgbLabel}>RGB {color.r}, {color.g}, {color.b}</div>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Hue</div>
                <div className={styles.metricValue}>{color.hue}</div>
                <div className={styles.metricDesc}>{color.hueName}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Value</div>
                <div className={styles.metricValue}>{color.value.toFixed(1)}</div>
                <div className={styles.metricDesc}>{valueDescription(color.value)}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Chroma</div>
                <div className={styles.metricValue}>{color.chroma.toFixed(1)}</div>
                <div className={styles.metricDesc}>{chromaDescription(color.chroma)}</div>
              </div>
            </div>
            <div className={styles.bars}>
              <div className={styles.barRow}>
                <span className={styles.barLabel}>V</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${color.value * 10}%`, background: `hsl(0,0%,${color.value * 10}%)` }} />
                </div>
                <span className={styles.barVal}>{color.value.toFixed(1)}</span>
              </div>
              <div className={styles.barRow}>
                <span className={styles.barLabel}>C</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${Math.min(100, color.chroma * 5)}%`, background: `rgb(${color.r},${color.g},${color.b})` }} />
                </div>
                <span className={styles.barVal}>{color.chroma.toFixed(1)}</span>
              </div>
            </div>
            <div className={styles.munsellNotation}>
              {color.hue} {color.value.toFixed(1)}/{color.chroma.toFixed(1)}
            </div>
          </div>
        ) : (
          <div className={styles.hint}>
            {image ? 'Klick ins Bild →' : 'Bild laden um zu starten'}
          </div>
        )}

        {image && (
          <button className={styles.changeBtn} style={{
            marginTop: 'auto',
            background: 'rgba(200,169,110,0.1)',
            border: '1px solid rgba(200,169,110,0.3)',
            color: '#c8a96e',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            cursor: 'pointer'
          }} onClick={() => { setImage(null); setColor(null) }}>
            Anderes Bild laden
          </button>
        )}
      </aside>

      <main className={styles.main}>
        {!image ? (
          <div
            className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.dropIcon}>+</div>
            <div className={styles.dropTitle}>Referenzbild laden</div>
            <div className={styles.dropSub}>Klicken oder hierher ziehen</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => loadFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div
            className={styles.canvasWrap}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setCursor(c => ({ ...c, visible: false }))}
          >
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              onClick={handleCanvasClick}
              style={{ display: 'block' }}
            />
            {cursor.visible && (
              <div
                className={styles.crosshair}
                style={{ left: cursor.x, top: cursor.y }}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}