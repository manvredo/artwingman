import { useRef, useState, useCallback } from 'react'
import { rgbToMunsell, chromaDescription, valueDescription, samplePixels } from '../lib/munsell'
import styles from '../styles/Home.module.css'
import HueWheel from '../components/HueWheel'
import Palette from '../components/Palette'
import GridOverlay from '../components/GridOverlay'

const DEFAULT_COLOR = {
  r: null, g: null, b: null,
  hue: '—', hueName: '—', hueAngle: 0,
  value: null, chroma: null
}

function AccordionDrawer({ title, isOpen, onToggle, children }) {
  return (
    <div className={styles.drawer}>
      <button className={`${styles.drawerHeader} ${isOpen ? styles.drawerHeaderActive : ''}`} onClick={onToggle}>
        <span className={styles.drawerTitle}>{title}</span>
        <span className={styles.drawerArrow}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className={styles.drawerBody}>{children}</div>}
    </div>
  )
}

export default function Home() {
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const originalImageDataRef = useRef(null)
  const [image, setImage] = useState(null)
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 })
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false })
  const [sampleRadius, setSampleRadius] = useState(3)
  const [dragging, setDragging] = useState(false)
  const [openDrawer, setOpenDrawer] = useState(['color'])
  const [valueSteps, setValueSteps] = useState(5)
  const [showGray, setShowGray] = useState(false)
  const [valueRating, setValueRating] = useState(null)
  const [palette, setPalette] = useState([])
  const [selectedSwatch, setSelectedSwatch] = useState(null)
  const [gridMode, setGridMode] = useState(null)
  const [squareGridSize, setSquareGridSize] = useState(4)
  const [showDiagonals, setShowDiagonals] = useState(false)

  const toggleDrawer = (name) => setOpenDrawer(prev =>
    prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]
  )

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setImage(img)
        setImgDims({ w: img.width, h: img.height })
        setColor(DEFAULT_COLOR)
        setShowGray(false)
        setValueRating(null)
        setTimeout(() => {
          const canvas = canvasRef.current
          if (canvas) {
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(img, 0, 0)
            originalImageDataRef.current = ctx.getImageData(0, 0, img.width, img.height)
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

  const applyValueGroups = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imageData = new ImageData(
      new Uint8ClampedArray(originalImageDataRef.current.data),
      originalImageDataRef.current.width,
      originalImageDataRef.current.height
    )
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2]
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const group = Math.min(valueSteps - 1, Math.floor((lum / 255) * valueSteps))
      const grayVal = Math.round((group / (valueSteps - 1)) * 255)
      data[i] = data[i+1] = data[i+2] = grayVal
    }
    ctx.putImageData(imageData, 0, 0)
    setShowGray(true)
    if (valueSteps <= 4) setValueRating('green')
    else if (valueSteps <= 7) setValueRating('yellow')
    else setValueRating('red')
  }, [valueSteps])

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.putImageData(originalImageDataRef.current, 0, 0)
    setShowGray(false)
    setValueRating(null)
  }, [])

  const addToPalette = useCallback(() => {
    if (!color || color.r === null) return
    if (palette.length >= 24) return
    setPalette(prev => {
      const newPalette = [...prev, { ...color }]
      setSelectedSwatch(newPalette.length - 1)
      return newPalette
    })
  }, [color, palette])

  const removeFromPalette = useCallback((index) => {
    setPalette(prev => prev.filter((_, i) => i !== index))
    setSelectedSwatch(null)
  }, [])

  const hasColor = color.r !== null

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>AW</span>
          <div>
            <div className={styles.logoName}>ArtWingman</div>
            <div className={styles.logoSub}>v0.4</div>
          </div>
        </div>

        <div className={styles.accordion}>

          <AccordionDrawer title="Color Finder" isOpen={openDrawer.includes('color')} onToggle={() => toggleDrawer('color')}>
            <div className={styles.drawerControls}>
              <div className={styles.sectionLabel}>Sample Radius</div>
              <div className={styles.sliderRow}>
                <input type="range" min="1" max="20" value={sampleRadius}
                  onChange={e => setSampleRadius(Number(e.target.value))}
                  className={styles.slider} />
                <span className={styles.sliderVal}>{sampleRadius}px</span>
              </div>
            </div>
            <div className={styles.drawerResult}>
              <div className={styles.swatch} style={{ background: hasColor ? `rgb(${color.r},${color.g},${color.b})` : '#2a2a2a' }} />
              <div className={styles.rgbLabel}>{hasColor ? `RGB ${color.r}, ${color.g}, ${color.b}` : 'RGB — — —'}</div>
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Hue</div>
                  <div className={styles.metricValue}>{color.hue}</div>
                  <div className={styles.metricDesc}>{color.hueName}</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Value</div>
                  <div className={styles.metricValue}>{hasColor ? color.value.toFixed(1) : '—'}</div>
                  <div className={styles.metricDesc}>{hasColor ? valueDescription(color.value) : '0-10 scale'}</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Chroma</div>
                  <div className={styles.metricValue}>{hasColor ? color.chroma.toFixed(1) : '—'}</div>
                  <div className={styles.metricDesc}>{hasColor ? chromaDescription(color.chroma) : 'saturation'}</div>
                </div>
              </div>
              <div className={styles.munsellNotation}>
                {hasColor ? `${color.hue} ${color.value.toFixed(1)}/${color.chroma.toFixed(1)}` : 'Munsell — / —'}
              </div>
              {hasColor && palette.length < 24 && (
                <button className={styles.btnPrimary} onClick={addToPalette}>
                  + Add to Palette
                </button>
              )}
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Value Groups" isOpen={openDrawer.includes('value')} onToggle={() => toggleDrawer('value')}>
            <div className={styles.drawerControls}>
              <div className={styles.sectionLabel}>Number of steps</div>
              <div className={styles.sliderRow}>
                <input type="range" min="3" max="10" step="1" value={valueSteps}
                  onChange={e => setValueSteps(Number(e.target.value))}
                  className={styles.slider} />
                <span className={styles.sliderVal}>{valueSteps}</span>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btnPrimary} onClick={applyValueGroups} disabled={!image}>
                  Analyze
                </button>
                {showGray && (
                  <button className={styles.btnSecondary} onClick={resetCanvas}>
                    Reset
                  </button>
                )}
              </div>
            </div>
            {valueRating && (
              <div className={styles.drawerResult}>
                <div className={`${styles.ampel} ${styles['ampel' + valueRating]}`}>
                  {valueRating === 'green' && `${valueSteps} values — ideal for painting`}
                  {valueRating === 'yellow' && `${valueSteps} values — acceptable`}
                  {valueRating === 'red' && `${valueSteps} values — too complex, simplify`}
                </div>
                <div className={styles.valueSteps}>
                  {Array.from({ length: valueSteps }).map((_, i) => (
                    <div key={i} className={styles.valueStep}
                      style={{ background: `hsl(0,0%,${Math.round((i / (valueSteps - 1)) * 100)}%)` }} />
                  ))}
                </div>
              </div>
            )}
          </AccordionDrawer>

          <AccordionDrawer title="Hue Wheel" isOpen={openDrawer.includes('hue')} onToggle={() => toggleDrawer('hue')}>
            <div className={styles.drawerResult}>
              <HueWheel
                hueAngle={color.hueAngle}
                hueName={color.hueName}
                color={hasColor ? `rgb(${color.r},${color.g},${color.b})` : null}
                active={hasColor}
              />
            </div>
          </AccordionDrawer>

          <AccordionDrawer title={`Palette ${palette.length > 0 ? `(${palette.length})` : ''}`} isOpen={openDrawer.includes('palette')} onToggle={() => toggleDrawer('palette')}>
            <div className={styles.drawerResult}>
              <Palette
                palette={palette}
                selected={selectedSwatch}
                onSelect={(i) => setSelectedSwatch(prev => prev === i ? null : i)}
                onRemove={removeFromPalette}
                onClear={() => { setPalette([]); setSelectedSwatch(null) }}
              />
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Paint Match" isOpen={openDrawer.includes('paint')} onToggle={() => toggleDrawer('paint')}>
            <div className={styles.comingSoon}>Pro feature — coming soon</div>
          </AccordionDrawer>

        </div>

        {image && (
          <button className={styles.changeBtnSidebar} onClick={() => {
            setImage(null)
            setColor(DEFAULT_COLOR)
            setShowGray(false)
            setValueRating(null)
            originalImageDataRef.current = null
          }}>
            Load new image
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
            <div className={styles.dropTitle}>Load reference image</div>
            <div className={styles.dropSub}>Click or drag & drop</div>
            <input ref={fileInputRef} type="file" accept="image/*"
              style={{ display: 'none' }}
              onChange={e => loadFile(e.target.files[0])} />
          </div>
        ) : (
          <div className={styles.canvasArea}>
            <div className={styles.toolbar}>
              <button
                className={`${styles.toolBtn} ${gridMode === '3x3' ? styles.toolBtnActive : ''}`}
                onClick={() => setGridMode(m => m === '3x3' ? null : '3x3')}
              >3×3</button>
              <button
                className={`${styles.toolBtn} ${gridMode === '4x4' ? styles.toolBtnActive : ''}`}
                onClick={() => setGridMode(m => m === '4x4' ? null : '4x4')}
              >4×4</button>
              <button
                className={`${styles.toolBtn} ${gridMode === 'square' ? styles.toolBtnActive : ''}`}
                onClick={() => setGridMode(m => m === 'square' ? null : 'square')}
              >Grid</button>
              <select
                className={styles.gridSizeSelect}
                value={squareGridSize}
                onChange={e => { setSquareGridSize(Number(e.target.value)); setGridMode('square') }}
              >
                {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                  <option key={n} value={n}>{n}×{n}</option>
                ))}
              </select>
              <button
                className={`${styles.toolBtn} ${showDiagonals ? styles.toolBtnActive : ''}`}
                onClick={() => setShowDiagonals(d => !d)}
                disabled={!gridMode}
              >Diag</button>
            </div>
            <div className={styles.canvasWrap}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setCursor(c => ({ ...c, visible: false }))}>
              <canvas ref={canvasRef} className={styles.canvas} onClick={handleCanvasClick} />
              <GridOverlay gridMode={gridMode} squareGridSize={squareGridSize} showDiagonals={showDiagonals} />
              {cursor.visible && (
                <div className={styles.crosshair} style={{ left: cursor.x, top: cursor.y }} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}