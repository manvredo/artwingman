import { useRef, useState, useCallback, useEffect } from 'react'
import { rgbToMunsell, chromaDescription, valueDescription, samplePixels } from '../lib/munsell'
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
  const [openDrawer, setOpenDrawer] = useState(['color'])
  const [valueSteps, setValueSteps] = useState(5)
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

  const sampleColor = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = imgDims.w / rect.width
    const scaleY = imgDims.h / rect.height
    const px = Math.floor((e.clientX - rect.left) * scaleX)
    const py = Math.floor((e.clientY - rect.top) * scaleY)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imageData = ctx.getImageData(0, 0, imgDims.w, imgDims.h)
    const { r, g, b } = samplePixels(imageData, px, py, sampleRadius, imgDims.w, imgDims.h)
    setColor({ r, g, b, ...rgbToMunsell(r, g, b) })
  }, [imgDims, sampleRadius])

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
  }, [])

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
    applyFilter(filter, filterStrength)
  }, [applyFilter, filterStrength])

  const handleStrengthChange = useCallback((strength) => {
    setFilterStrength(strength)
    if (activeFilter !== 'soften') return
    clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => applyFilter('soften', strength), 300)
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

        {image && (
          <button className={styles.changeBtnSidebar} onClick={() => {
            setImage(null)
            setColor(DEFAULT_COLOR)
            setShowGray(false)
            setValueRating(null)
            setActiveFilter(null)
            setViewport({ zoom: 1, panX: 0, panY: 0 })
            originalImageDataRef.current = null
          }}>
            Load new image
          </button>
        )}
      </aside>

      <div className={styles.rightArea}>
        <div className={styles.toolbar} style={{ padding: '10px 12px 8px' }}>
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
                  cursor: dragRef.current?.moved ? 'grabbing' : viewport.zoom > 1 ? 'grab' : 'crosshair',
                }}
              >
                <canvas ref={canvasRef} className={styles.canvas} />
                <GridOverlay gridMode={gridMode} squareGridSize={squareGridSize} showDiagonals={showDiagonals} gridColor={gridColor} gridOpacity={gridOpacity / 100} />
                {cursor.visible && (
                  <div className={styles.crosshair} style={{ left: cursor.x, top: cursor.y }} />
                )}
              </div>
            </div>
          </div>
        )}

        <div className={styles.infoBar}>
          {/* Panel 1: Swatch + RGB */}
          <div className={`${styles.infoPanel} ${styles.infoPanelSwatch}`}>
            <div className={styles.infoLabel}>Color</div>
            <div style={{
              flex: 1,
              borderRadius: 6,
              background: hasColor ? `rgb(${color.r},${color.g},${color.b})` : '#2a2a2a',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: 0,
            }} />
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

          {/* Panel 3: Hue Wheel */}
          <div className={`${styles.infoPanel} ${styles.infoPanelHueWheel}`}>
            <HueWheel
              hueAngle={color.hueAngle}
              hueName={color.hueName}
              color={hasColor ? `rgb(${color.r},${color.g},${color.b})` : null}
              active={hasColor}
            />
          </div>

          {/* Panel 4: Munsell Chart */}
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

          {/* Panel 5: Sample + Add to Palette */}
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
                <input type="range" min="1" max="20" value={sampleRadius}
                  onChange={e => setSampleRadius(Number(e.target.value))}
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

          {/* Panel 6: Palette */}
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
        </div>
      </div>
    </div>
  )
}
