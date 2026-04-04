import { useRef, useState, useCallback, useEffect } from 'react'
import { rgbToMunsell, chromaDescription, valueDescription, samplePixels, labToRgb } from '../lib/munsell'
import { FILTERS } from '../components/Filters'
import styles from '../styles/Home.module.css'
import HueWheel from '../components/HueWheel'
import Palette from '../components/Palette'
import GridOverlay from '../components/GridOverlay'
import Filters from '../components/Filters'
import MunsellChart from '../components/MunsellChart'

const DEFAULT_COLOR = {
  r: null, g: null, b: null,
  hue: '—', hueName: '—', hueAngle: 0,
  value: null, chroma: null
}

function AccordionDrawer({ title, isOpen, onToggle, children, noToggle }) {
  return (
    <div className={styles.drawer}>
      <button className={`${styles.drawerHeader} ${isOpen ? styles.drawerHeaderActive : ''}`} onClick={noToggle ? undefined : onToggle}
        style={noToggle ? { cursor: 'default', pointerEvents: 'none' } : {}}>
        <span className={styles.drawerTitle}>{title}</span>
        {!noToggle && <span className={styles.drawerArrow}>{isOpen ? '▼' : '▶'}</span>}
      </button>
      {isOpen && <div className={styles.drawerBody}>{children}</div>}
    </div>
  )
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) }
}

const CROSSHAIR_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cline x1='16' y1='2' x2='16' y2='30' stroke='%23000' stroke-width='2'/%3E%3Cline x1='2' y1='16' x2='30' y2='16' stroke='%23000' stroke-width='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='30' stroke='%23fff' stroke-width='1'/%3E%3Cline x1='2' y1='16' x2='30' y2='16' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E") 16 16, crosshair`

export default function Home() {
  const canvasRef = useRef(null)
  const canvasWrapRef = useRef(null)
  const fileInputRef = useRef(null)
  const originalImageDataRef = useRef(null)
  const workerRef = useRef(null)
  const filterDebounceRef = useRef(null)
  const dragRef = useRef(null)
  const minimapCanvasRef = useRef(null)
  const [image, setImage] = useState(null)
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 })
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false })
  const [sampleRadius, setSampleRadius] = useState(3)
  const [dragging, setDragging] = useState(false)
  const [openDrawer, setOpenDrawer] = useState(['color', 'value'])
  const [valueSteps, setValueSteps] = useState(10)
  const [showGray, setShowGray] = useState(false)
  const [valueRating, setValueRating] = useState(null)
  const [palette, setPalette] = useState([])
  const [selectedSwatch, setSelectedSwatch] = useState(null)
  const [gridMode, setGridMode] = useState(null)
  const [squareGridSize, setSquareGridSize] = useState(4)
  const [showDiagonals, setShowDiagonals] = useState(false)
  const [gridColor, setGridColor] = useState('#ffffff')
  const [gridOpacity, setGridOpacity] = useState(90)
  const [activeFilter, setActiveFilter] = useState(null)
  const [filterStrength, setFilterStrength] = useState(5)
  const [viewport, setViewport] = useState({ zoom: 1, panX: 0, panY: 0 })
  const [canvasBg, setCanvasBg] = useState('#222222')
  const [wrapSz, setWrapSz] = useState({ w: 0, h: 0 })
  const [clickPos, setClickPos] = useState(null)
  const [clickImagePos, setClickImagePos] = useState(null)
  const [showColorOverlay, setShowColorOverlay] = useState(false)
  const [compGray, setCompGray] = useState(3)
  const [colorSteps, setColorSteps] = useState(10)
  const [showColorDecreased, setShowColorDecreased] = useState(false)
  const [colorRating, setColorRating] = useState(null)
  const [colorClusters, setColorClusters] = useState([])
  const [paletteClusters, setPaletteClusters] = useState([])

  const applyValueGroupsRef = useRef(null)
  const paletteWorkerRef = useRef(null)

  const grayTones = ['#ffffff', '#cccccc', '#999999', '#666666', '#444444', '#222222', '#111111']

  const bgColors = ['#ffffff', '#cccccc', '#999999', '#666666', '#444444', '#222222', '#111111']

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
        setActiveFilter(null)
        setViewport({ zoom: 1, panX: 0, panY: 0 })
        setClickPos(null)
        setClickImagePos(null)
        setShowColorDecreased(false)
        setColorRating(null)
        setColorClusters([])
        setPaletteClusters([])
        setTimeout(() => {
          const canvas = canvasRef.current
          if (canvas) {
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(img, 0, 0)
            originalImageDataRef.current = ctx.getImageData(0, 0, img.width, img.height)
            const src = originalImageDataRef.current
            const buffer = new Uint8ClampedArray(src.data).buffer
            if (paletteWorkerRef.current) paletteWorkerRef.current.terminate()
            paletteWorkerRef.current = new Worker('/filterWorker.js')
            paletteWorkerRef.current.onmessage = (e) => {
              setPaletteClusters(e.data.clusters || [])
              paletteWorkerRef.current = null
            }
            paletteWorkerRef.current.postMessage(
              { filter: 'kmeans-analyze', strength: 6, buffer, width: src.width, height: src.height },
              [buffer]
            )
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

  const lastImgPosRef = useRef(null)

  const sampleAt = useCallback((px, py, radius) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imageData = ctx.getImageData(0, 0, imgDims.w, imgDims.h)
    const { r, g, b } = samplePixels(imageData, px, py, radius, imgDims.w, imgDims.h)
    setColor({ r, g, b, ...rgbToMunsell(r, g, b) })
  }, [imgDims])

  const sampleColor = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = imgDims.w / rect.width
    const scaleY = imgDims.h / rect.height
    const px = Math.floor((e.clientX - rect.left) * scaleX)
    const py = Math.floor((e.clientY - rect.top) * scaleY)
    lastImgPosRef.current = { px, py }
    sampleAt(px, py, sampleRadius)
    setClickPos({ x: (e.clientX - rect.left) / viewport.zoom, y: (e.clientY - rect.top) / viewport.zoom })
    const wrap = canvasWrapRef.current
    if (wrap) {
      const wr = wrap.getBoundingClientRect()
      const sx = e.clientX - wr.left - wr.width / 2
      const sy = e.clientY - wr.top - wr.height / 2
      setClickImagePos({ x: (sx - viewport.panX) / viewport.zoom, y: (sy - viewport.panY) / viewport.zoom })
    }
  }, [imgDims, sampleRadius, sampleAt, viewport.zoom, viewport.panX, viewport.panY])

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: viewport.panX,
      startPanY: viewport.panY,
      moved: false,
    }
  }, [viewport.panX, viewport.panY])

  const handleCanvasMouseUp = useCallback((e) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || e.button !== 0) return
    if (!drag.moved) sampleColor(e)
  }, [sampleColor])

  const handleMouseMove = useCallback((e) => {
    const drag = dragRef.current
    if (drag) {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (!drag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) drag.moved = true
      if (drag.moved) {
        setViewport(v => ({ ...v, panX: drag.startPanX + dx, panY: drag.startPanY + dy }))
      }
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setCursor({
      x: (e.clientX - rect.left) / viewport.zoom,
      y: (e.clientY - rect.top) / viewport.zoom,
      visible: true,
    })
  }, [viewport.zoom])

  useEffect(() => {
    const el = canvasWrapRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left - rect.width / 2
      const cy = e.clientY - rect.top - rect.height / 2
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      setViewport(v => {
        const newZoom = Math.min(Math.max(v.zoom * factor, 0.25), 12)
        const r = newZoom / v.zoom
        return { zoom: newZoom, panX: cx * (1 - r) + v.panX * r, panY: cy * (1 - r) + v.panY * r }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [image])

  useEffect(() => {
    const el = canvasWrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setWrapSz({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [image])

  useEffect(() => {
    const mc = minimapCanvasRef.current
    if (!mc || !image) return
    const ctx = mc.getContext('2d')
    ctx.clearRect(0, 0, mc.width, mc.height)
    ctx.drawImage(image, 0, 0, mc.width, mc.height)
  }, [image])

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
      const lum = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]
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
  applyValueGroupsRef.current = applyValueGroups

  const applyColorDecreaser = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const src = originalImageDataRef.current
    const buffer = new Uint8ClampedArray(src.data).buffer
    if (workerRef.current) workerRef.current.terminate()
    workerRef.current = new Worker('/filterWorker.js')
    workerRef.current.onmessage = (e) => {
      const out = new Uint8ClampedArray(e.data.out)
      canvas.getContext('2d', { willReadFrequently: true })
        .putImageData(new ImageData(out, src.width, src.height), 0, 0)
      setShowColorDecreased(true)
      setColorClusters(e.data.clusters || [])
      workerRef.current = null
    }
    workerRef.current.postMessage(
      { filter: 'kmeans', strength: colorSteps, buffer, width: src.width, height: src.height },
      [buffer]
    )
  }, [colorSteps])

  const resetColorDecreaser = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.putImageData(originalImageDataRef.current, 0, 0)
    setShowColorDecreased(false)
    setColorRating(null)
    setColorClusters([])
  }, [])

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.putImageData(originalImageDataRef.current, 0, 0)
    setShowGray(false)
    setValueRating(null)
  }, [])

  const applyFilter = useCallback((filter, strength) => {
    const canvas = canvasRef.current
    if (!canvas || !originalImageDataRef.current) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!filter) {
      ctx.putImageData(originalImageDataRef.current, 0, 0)
      return
    }
    const src = originalImageDataRef.current
    const buffer = new Uint8ClampedArray(src.data).buffer
    if (workerRef.current) workerRef.current.terminate()
    workerRef.current = new Worker('/filterWorker.js')
    workerRef.current.onmessage = (e) => {
      const out = new Uint8ClampedArray(e.data.out)
      ctx.putImageData(new ImageData(out, src.width, src.height), 0, 0)
      workerRef.current = null
    }
    workerRef.current.postMessage({ filter, strength, buffer, width: src.width, height: src.height }, [buffer])
  }, [])

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter)
    const cfg = FILTERS.find(f => f.id === filter)
    const strength = cfg?.def ?? filterStrength
    if (cfg?.def !== undefined) setFilterStrength(cfg.def)
    applyFilter(filter, strength)
  }, [applyFilter, filterStrength])

  const handleStrengthChange = useCallback((strength) => {
    setFilterStrength(strength)
    if (!activeFilter) return
    const cfg = FILTERS.find(f => f.id === activeFilter)
    if (!cfg?.min) return
    clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => applyFilter(activeFilter, strength), 300)
  }, [applyFilter, activeFilter])

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

  const handleHueWheelClick = useCallback((deg) => {
    const rad = deg * Math.PI / 180
    const { r, g, b } = labToRgb(55, 40 * Math.cos(rad), 40 * Math.sin(rad))
    setColor({ r, g, b, ...rgbToMunsell(r, g, b) })
    setClickPos(null)
  }, [])

  const centerImage = useCallback(() => {
    setViewport(v => ({ ...v, panX: 0, panY: 0 }))
  }, [])

  const fitHorizontal = useCallback(() => {
    if (!imgDims.w || !imgDims.h || !wrapSz.w || !wrapSz.h) return
    const aspect = imgDims.w / imgDims.h
    const baseW = Math.min(wrapSz.w, wrapSz.h * aspect)
    setViewport({ zoom: wrapSz.w / baseW, panX: 0, panY: 0 })
  }, [imgDims, wrapSz])

  const fitVertical = useCallback(() => {
    if (!imgDims.w || !imgDims.h || !wrapSz.w || !wrapSz.h) return
    const aspect = imgDims.w / imgDims.h
    const baseH = Math.min(wrapSz.h, wrapSz.w / aspect)
    setViewport({ zoom: wrapSz.h / baseH, panX: 0, panY: 0 })
  }, [imgDims, wrapSz])

  const ZOOM_TO_CLICK_LEVEL = 4
  const zoomToClick = useCallback(() => {
    if (!clickImagePos) return
    setViewport({
      zoom: ZOOM_TO_CLICK_LEVEL,
      panX: -clickImagePos.x * ZOOM_TO_CLICK_LEVEL,
      panY: -clickImagePos.y * ZOOM_TO_CLICK_LEVEL,
    })
  }, [clickImagePos])

  const hasColor = color.r !== null

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>AW</span>
          <div>
            <div className={styles.logoName}>ArtWingman</div>
            <div className={styles.logoSub}>v0.6</div>
          </div>
        </div>

        <div className={styles.accordion}>

          <AccordionDrawer title="Value Groups" isOpen={true} onToggle={() => {}} noToggle>
            <div className={styles.drawerControls}>
              <div className={styles.sectionLabel}>Number of steps</div>
              <div className={styles.sliderRow}>
                <input type="range" min="2" max="10" step="1" value={valueSteps}
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
            <div className={styles.drawerResult}>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#c8a96e' }}>
                {valueSteps} values
              </div>
              <div className={styles.valueSteps}>
                {Array.from({ length: valueSteps }).map((_, i) => (
                  <div key={i} className={styles.valueStep}
                    style={{ background: `hsl(0,0%,${Math.round((i / (valueSteps - 1)) * 100)}%)` }} />
                ))}
              </div>
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Color Groups" isOpen={true} onToggle={() => {}} noToggle>
            <div className={styles.drawerControls}>
              <div className={styles.sectionLabel}>Number of steps</div>
              <div className={styles.sliderRow}>
                <input type="range" min="1" max="10" step="1" value={colorSteps}
                  onChange={e => setColorSteps(Number(e.target.value))}
                  className={styles.slider} />
                <span className={styles.sliderVal}>{colorSteps}</span>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btnPrimary} onClick={applyColorDecreaser} disabled={!image}>
                  Analyze
                </button>
                {showColorDecreased && (
                  <button className={styles.btnSecondary} onClick={resetColorDecreaser}>
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className={styles.drawerResult}>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#c8a96e' }}>
                {colorSteps} colors
              </div>
              <div className={styles.valueSteps}>
                {colorClusters.length > 0
                  ? [...colorClusters]
                      .sort((a, b) => (0.2126*a.r + 0.7152*a.g + 0.0722*a.b) - (0.2126*b.r + 0.7152*b.g + 0.0722*b.b))
                      .map((c, i) => (
                        <div key={i} className={styles.valueStep}
                          style={{ background: `rgb(${c.r},${c.g},${c.b})` }} />
                      ))
                  : Array.from({ length: colorSteps }).map((_, i) => (
                      <div key={i} className={styles.valueStep}
                        style={{ background: '#2a2a2a' }} />
                    ))
                }
              </div>
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Color Palette" isOpen={true} onToggle={() => {}} noToggle>
            <div className={styles.drawerResult}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {(paletteClusters.length > 0
                  ? [...paletteClusters].sort((a, b) =>
                      (0.2126*b.r + 0.7152*b.g + 0.0722*b.b) - (0.2126*a.r + 0.7152*a.g + 0.0722*a.b)
                    ).slice(0, 6)
                  : Array.from({ length: 6 }, () => null)
                ).map((c, i) => {
                  const m = c ? rgbToMunsell(c.r, c.g, c.b) : null
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{
                        width: '100%', height: 36, borderRadius: 3,
                        background: c ? `rgb(${c.r},${c.g},${c.b})` : '#2a2a2a',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }} />
                      <span style={{ fontSize: 11, color: '#8a8680', fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.3 }}>
                        {m ? `${m.hue}` : '—'}<br/>
                        {m ? `${m.value}/${m.chroma}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Filters" isOpen={openDrawer.includes('filters')} onToggle={() => toggleDrawer('filters')}>
            <div className={styles.drawerControls}>
              <Filters
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                filterStrength={filterStrength}
                onStrengthChange={handleStrengthChange}
              />
            </div>
          </AccordionDrawer>

          <AccordionDrawer title="Paint Match" isOpen={openDrawer.includes('paint')} onToggle={() => toggleDrawer('paint')}>
            <div className={styles.comingSoon}>Pro feature — coming soon</div>
          </AccordionDrawer>

        </div>

      </aside>

      <div className={styles.rightArea}>
        <div className={styles.toolbar} style={{ padding: '10px 12px 8px' }}>
              {image && (
                <button className={styles.toolBtn} onClick={() => {
                  setImage(null)
                  setColor(DEFAULT_COLOR)
                  setShowGray(false)
                  setValueRating(null)
                  setActiveFilter(null)
                  setViewport({ zoom: 1, panX: 0, panY: 0 })
                  setShowColorDecreased(false)
                  setColorRating(null)
                  setColorClusters([])
                  setPaletteClusters([])
                  originalImageDataRef.current = null
                }}>
                  Load new image
                </button>
              )}
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
              <input
                type="color"
                value={gridColor}
                onChange={e => setGridColor(e.target.value)}
                className={styles.gridColorPicker}
                title="Grid color"
                disabled={!gridMode}
              />
              <input
                type="range" min="10" max="100"
                value={gridOpacity}
                onChange={e => setGridOpacity(Number(e.target.value))}
                className={styles.gridOpacitySlider}
                title={`Opacity ${gridOpacity}%`}
                disabled={!gridMode}
              />
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {bgColors.map(c => (
                  <div
                    key={c}
                    onClick={() => setCanvasBg(c)}
                    style={{
                      width: 24,
                      height: 16,
                      borderRadius: 4,
                      background: c,
                      cursor: 'pointer',
                      border: canvasBg === c ? '2px solid #c8a96e' : '1px solid rgba(255,255,255,0.15)',
                      transition: 'border 0.15s',
                    }}
                  />
                ))}
              </div>
              <button
                className={styles.toolBtn}
                onClick={() => setViewport({ zoom: 1, panX: 0, panY: 0 })}
                title="Reset zoom"
                style={{ opacity: viewport.zoom === 1 && viewport.panX === 0 && viewport.panY === 0 ? 0.35 : 1 }}
              >
                1:1
              </button>
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {!image ? (
          <div
            className={`${styles.dropzoneArea} ${dragging ? styles.dropzoneAreaActive : ''}`}
            style={{ background: canvasBg }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}>
              <div className={styles.dropIcon}>+</div>
              <div className={styles.dropTitle}>Load reference image</div>
              <div className={styles.dropSub}>Click or drag & drop</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*"
              style={{ display: 'none' }}
              onChange={e => loadFile(e.target.files[0])} />
          </div>
        ) : (
          <div className={styles.canvasSection}>
            <div
              ref={canvasWrapRef}
              className={styles.canvasWrap}
              style={{ background: canvasBg }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => { setCursor(c => ({ ...c, visible: false })); dragRef.current = null }}
              onMouseDown={handleCanvasMouseDown}
              onMouseUp={handleCanvasMouseUp}
            >
              {(() => {
                const minimapW = 150
                const minimapH = 150
                const { zoom, panX, panY } = viewport
                const frameW = minimapW / zoom
                const frameH = minimapH / zoom
                const frameX = (-panX / zoom) * (minimapW / (imgDims.w || 1)) + minimapW / 2 - frameW / 2
                const frameY = (-panY / zoom) * (minimapH / (imgDims.h || 1)) + minimapH / 2 - frameH / 2
                return (
                  <div style={{
                    position: 'absolute', top: 10, left: 10, zIndex: 10,
                    width: minimapW, height: minimapH,
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}>
                    <img src={image?.src} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    {zoom > 1 && (
                      <div style={{
                        position: 'absolute',
                        left: frameX, top: frameY,
                        width: frameW, height: frameH,
                        border: '2px solid #ff3333',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                      }} />
                    )}
                  </div>
                )
              })()}
              <div
                className={styles.canvasInner}
                style={{
                  ...(imgDims.w && imgDims.h ? { aspectRatio: `${imgDims.w} / ${imgDims.h}` } : {}),
                  transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
                  transformOrigin: 'center',
                  cursor: dragRef.current?.moved ? 'grabbing' : CROSSHAIR_CURSOR,
                }}
              >
                <canvas ref={canvasRef} className={styles.canvas} />
                <GridOverlay gridMode={gridMode} squareGridSize={squareGridSize} showDiagonals={showDiagonals} gridColor={gridColor} gridOpacity={gridOpacity / 100} />
                {clickPos && (() => {
                  const displayW = canvasRef.current?.offsetWidth || 1
                  const scale = displayW / (imgDims.w || 1)
                  const half = Math.max(4, sampleRadius * scale)
                  const sq = half * 2
                  return (
                    <>
                      {/* Crosshair */}
                      <div style={{ position: 'absolute', left: clickPos.x - 12, top: clickPos.y, width: 24, height: 1, background: 'rgba(255,255,255,0.9)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', left: clickPos.x, top: clickPos.y - 12, width: 1, height: 24, background: 'rgba(255,255,255,0.9)', pointerEvents: 'none' }} />
                      {/* Sample radius square */}
                      {sampleRadius >= 10 && (
                        <div style={{
                          position: 'absolute',
                          left: clickPos.x - half,
                          top: clickPos.y - half,
                          width: sq,
                          height: sq,
                          border: '1px solid rgba(255,255,255,0.9)',
                          boxSizing: 'border-box',
                          pointerEvents: 'none',
                        }} />
                      )}
                    </>
                  )
                })()}
              </div>
              {showColorOverlay && hasColor && (
                <div
                  onClick={() => setShowColorOverlay(false)}
                  onMouseDown={e => e.stopPropagation()}
                  onMouseUp={e => e.stopPropagation()}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'relative',
                      width: '60%', height: '80%',
                      background: `rgb(${color.r},${color.g},${color.b})`,
                      borderRadius: 16,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                    }}
                  >
                    {/* X Button */}
                    <button
                      onClick={() => { setShowColorOverlay(false); setCompGray(3) }}
                      style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: 16, cursor: 'pointer' }}
                    >×</button>
                    {/* Gray comparison strip with embedded slider */}
                    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 228, borderRadius: '16px 0 0 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      {/* 7 gray fields with slider overlaid */}
                      <div style={{ position: 'relative', height: 48, flexShrink: 0 }}>
                        <div style={{ display: 'flex', height: '100%' }}>
                          {grayTones.map((g, i) => (
                            <div key={i} style={{
                              flex: 1, background: g,
                              outline: compGray === i ? '2px solid #c8a96e' : i === 3 ? '1px solid rgba(255,255,255,0.8)' : 'none',
                              outlineOffset: -2
                            }} />
                          ))}
                        </div>
                        <input
                          type="range" min="0" max="6" step="1" value={compGray}
                          onChange={e => setCompGray(Number(e.target.value))}
                          className={styles.sliderThin}
                          style={{ position: 'absolute', top: '50%', left: 0, width: '100%', transform: 'translateY(-50%)' }}
                        />
                      </div>
                      {/* Gray area */}
                      <div style={{ flex: 1, background: grayTones[compGray] }} />
                    </div>
                    {/* Color info */}
                    <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 600, color: color.value > 5 ? '#000000' : '#ffffff' }}>
                      {color.hue} {color.value.toFixed(1)}/{color.chroma.toFixed(1)}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, color: color.value > 5 ? '#000000' : '#ffffff' }}>Hue: {color.hue} — {color.hueName}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, color: color.value > 5 ? '#000000' : '#ffffff' }}>Value: {color.value.toFixed(1)}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, color: color.value > 5 ? '#000000' : '#ffffff' }}>Chroma: {color.chroma.toFixed(1)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className={styles.viewBtnStrip}>
          <button className={styles.viewBtn} onClick={fitVertical} title="Standardansicht" disabled={!image}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="5" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" rx="1"/>
              <line x1="8" y1="1" x2="8" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polyline points="6,3 8,1 10,3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polyline points="6,13 8,15 10,13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="1" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polyline points="3,6 1,8 3,10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polyline points="13,6 15,8 13,10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className={styles.viewBtn} onClick={zoomToClick} title="Zum Kreuz zoomen" disabled={!clickImagePos}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="8" y1="1" x2="8" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8" y1="11.5" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="8" x2="4.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11.5" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className={styles.viewBtn} onClick={fitHorizontal} title="Breite anpassen" disabled={!image}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="1" y1="2" x2="1" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="15" y1="2" x2="15" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5"/>
              <polyline points="5,5 1,8 5,11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
              <polyline points="11,5 15,8 11,11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        </div>

        <div className={styles.infoBar}>
          {/* Panel 1: Swatch + RGB */}
          <div className={`${styles.infoPanel} ${styles.infoPanelSwatch}`}>
            <div className={styles.infoLabel}>Color</div>
            <div
              onClick={() => hasColor && setShowColorOverlay(true)}
              title="Click to compare color"
              style={{
                flex: 1,
                borderRadius: 6,
                background: hasColor ? `rgb(${color.r},${color.g},${color.b})` : '#2a2a2a',
                border: '1px solid rgba(255,255,255,0.08)',
                minHeight: 0,
                cursor: hasColor ? 'pointer' : 'default',
              }}
            />
            <div className={styles.rgbLabel}>
              {hasColor ? `RGB ${color.r}, ${color.g}, ${color.b}` : 'RGB — — —'}
            </div>
          </div>

          {/* Panel 2: HVC + Munsell */}
          <div className={`${styles.infoPanel} ${styles.infoPanelHVC}`}>
            <div className={styles.infoLabel}>Munsell</div>
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
              {hasColor ? `${color.hue} ${color.value.toFixed(1)}/${color.chroma.toFixed(1)}` : '— / —'}
            </div>
          </div>

          {/* Panel 3: Sample + Add to Palette */}
          <div style={{
            width: 140,
            flexShrink: 0,
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#555250', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Sample Radius</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="range" min="1" max="50" value={sampleRadius}
                  onChange={e => {
                    const r = Number(e.target.value)
                    setSampleRadius(r)
                    if (lastImgPosRef.current) sampleAt(lastImgPosRef.current.px, lastImgPosRef.current.py, r)
                  }}
                  className={styles.slider} style={{ flex: 1 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8a8680', flexShrink: 0 }}>{sampleRadius}px</span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
            {hasColor && palette.length < 24 ? (
              <button onClick={addToPalette} style={{
                background: 'rgba(200,169,110,0.15)',
                border: '1px solid rgba(200,169,110,0.4)',
                color: '#c8a96e',
                borderRadius: 6,
                padding: 8,
                fontSize: 12,
                width: '100%',
                cursor: 'pointer',
              }}>+ Add to Palette</button>
            ) : (
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#555250' }}>
                {palette.length >= 24 ? 'Palette full' : 'Click image first'}
              </div>
            )}
          </div>

          {/* Panel 4: Hue Wheel */}
          <div className={`${styles.infoPanel} ${styles.infoPanelHueWheel}`}>
            <HueWheel
              hueAngle={color.hueAngle}
              hueName={color.hueName}
              color={hasColor ? `rgb(${color.r},${color.g},${color.b})` : null}
              active={hasColor}
              onHueClick={handleHueWheelClick}
            />
          </div>

          {/* Panel 5: Palette */}
          <div className={`${styles.infoPanel} ${styles.infoPanelPalette}`}>
            <div className={styles.infoLabel}>Palette</div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <Palette
                palette={palette}
                selected={selectedSwatch}
                onSelect={(i) => setSelectedSwatch(prev => prev === i ? null : i)}
                onRemove={removeFromPalette}
                onClear={() => { setPalette([]); setSelectedSwatch(null) }}
              />
            </div>
          </div>

          {/* Panel 6: Munsell Chart */}
          <div className={`${styles.infoPanel} ${styles.infoPanelChart}`}>
            <div className={styles.infoLabel}>Munsell Chart — {color.hueName !== '—' ? color.hueName : 'pick a color'}</div>
            <MunsellChart
              compact
              hueAngle={color.hueAngle}
              hueName={color.hueName}
              hue={color.hue}
              value={hasColor ? color.value : null}
              chroma={hasColor ? color.chroma : null}
              color={hasColor ? `rgb(${color.r},${color.g},${color.b})` : null}
            />
          </div>

        </div>
      </div>
    </div>
  )
}
