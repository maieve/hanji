import ExpoModulesCore
import PDFKit
import PencilKit

public final class HanjiDocumentModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HanjiDocumentCanvas")
    View(HanjiDocumentView.self) {
      Events("onDrawingChange", "onPageCount", "onPdfOutline", "onPdfLink", "onPencilDoubleTap", "onPencilSqueeze", "onStrokeAdded", "onStrokeTapped", "onHistoryChange", "onEraserEnded")
      Prop("pdfUri") { (view: HanjiDocumentView, uri: String?) in view.loadPDF(uri) }
      Prop("pageIndex") { (view: HanjiDocumentView, index: Int) in view.showPage(index) }
      Prop("drawingData") { (view: HanjiDocumentView, value: String) in view.loadDrawing(value) }
      Prop("fingerDrawingEnabled") { (view: HanjiDocumentView, value: Bool) in
        view.canvas.drawingPolicy = value ? .anyInput : .pencilOnly
      }
      Prop("tool") { (view: HanjiDocumentView, value: [String: Any]) in view.setTool(value) }
      Prop("undoSignal") { (view: HanjiDocumentView, value: Int) in view.applyUndoSignal(value) }
      Prop("redoSignal") { (view: HanjiDocumentView, value: Int) in view.applyRedoSignal(value) }
      Prop("zoomWindowEnabled") { (view: HanjiDocumentView, value: Bool) in view.setZoomWindow(value) }
      Prop("interactionEnabled") { (view: HanjiDocumentView, value: Bool) in view.canvas.isUserInteractionEnabled = value }
    }
  }
}

final class HanjiDocumentView: ExpoView, PKCanvasViewDelegate, UIPencilInteractionDelegate {
  let pdfView = PDFView()
  let canvas = PKCanvasView()
  let onDrawingChange = EventDispatcher()
  let onPageCount = EventDispatcher()
  let onPdfOutline = EventDispatcher()
  let onPdfLink = EventDispatcher()
  let onPencilDoubleTap = EventDispatcher()
  let onPencilSqueeze = EventDispatcher()
  let onStrokeAdded = EventDispatcher()
  let onStrokeTapped = EventDispatcher()
  let onHistoryChange = EventDispatcher()
  let onEraserEnded = EventDispatcher()
  private var document: PDFDocument?
  private var currentPage = 0
  private var loadedDrawing = ""
  private var knownStrokeCount = 0
  private var lastUndoSignal = 0
  private var lastRedoSignal = 0
  private var shapeKind: String?
  private var applyingShape = false
  private var activeKind = "pen"
  private var scratchEnabled = true
  private var zoomWindowEnabled = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .systemGray6
    pdfView.autoScales = true
    pdfView.displayMode = .singlePage
    pdfView.displayDirection = .horizontal
    pdfView.pageShadowsEnabled = false
    canvas.backgroundColor = .clear
    canvas.isOpaque = false
    canvas.drawingPolicy = .pencilOnly
    canvas.maximumSupportedContentVersion = .version2
    canvas.delegate = self
    let tap = UITapGestureRecognizer(target: self, action: #selector(handleCanvasTap(_:)))
    tap.cancelsTouchesInView = false
    tap.allowedTouchTypes = [NSNumber(value: UITouch.TouchType.direct.rawValue)]
    canvas.addGestureRecognizer(tap)
    let pencilInteraction = UIPencilInteraction(); pencilInteraction.delegate = self; addInteraction(pencilInteraction)
    addSubview(pdfView)
    addSubview(canvas)
  }

  func pencilInteractionDidTap(_ interaction: UIPencilInteraction) {
    onPencilDoubleTap(["preferredAction": String(describing: UIPencilInteraction.preferredTapAction)])
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
  }

  @available(iOS 17.5, *)
  func pencilInteraction(_ interaction: UIPencilInteraction, didReceiveTap tap: UIPencilInteraction.Tap) {
    onPencilDoubleTap(["preferredAction": String(describing: UIPencilInteraction.preferredTapAction)])
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
  }

  @available(iOS 17.5, *)
  func pencilInteraction(_ interaction: UIPencilInteraction, didReceiveSqueeze squeeze: UIPencilInteraction.Squeeze) {
    guard squeeze.phase == .began else { return }
    onPencilSqueeze(["preferredAction": String(describing: UIPencilInteraction.preferredSqueezeAction)])
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    pdfView.frame = bounds
    canvas.frame = bounds
    if canvas.contentSize.width < bounds.width || canvas.contentSize.height < bounds.height { canvas.contentSize = bounds.size }
  }

  func setZoomWindow(_ enabled: Bool) {
    guard enabled != zoomWindowEnabled else { return }
    zoomWindowEnabled = enabled
    canvas.minimumZoomScale = 1
    canvas.maximumZoomScale = enabled ? 5 : 1
    canvas.setZoomScale(enabled ? 2.5 : 1, animated: true)
    if !enabled { canvas.setContentOffset(.zero, animated: true) }
  }

  func loadPDF(_ uri: String?) {
    guard let uri, !uri.isEmpty else {
      document = nil
      pdfView.document = nil
      return
    }
    let url: URL?
    if uri.hasPrefix("file://") { url = URL(string: uri) } else { url = URL(fileURLWithPath: uri) }
    guard let url, pdfView.document?.documentURL != url, let pdf = PDFDocument(url: url) else { return }
    document = pdf
    pdfView.document = pdf
    pdfView.autoScales = true
    onPageCount(["count": pdf.pageCount])
    onPdfOutline(["items": outlineItems(pdf)])
    showPage(currentPage)
  }

  private func outlineItems(_ pdf: PDFDocument) -> [[String: Any]] {
    guard let root = pdf.outlineRoot else { return [] }
    var result: [[String: Any]] = []
    func visit(_ node: PDFOutline, depth: Int) {
      for index in 0..<node.numberOfChildren {
        guard let child = node.child(at: index) else { continue }
        let destination = child.destination ?? (child.action as? PDFActionGoTo)?.destination
        if let page = destination?.page {
          let pageIndex = pdf.index(for: page)
          if pageIndex != NSNotFound { result.append(["title": child.label ?? "페이지 \(pageIndex + 1)", "pageIndex": pageIndex, "depth": min(depth, 5)]) }
        }
        if result.count < 500 { visit(child, depth: depth + 1) }
      }
    }
    visit(root, depth: 0); return result
  }

  func showPage(_ index: Int) {
    currentPage = max(0, index)
    guard let page = document?.page(at: currentPage) else { return }
    pdfView.go(to: page)
    pdfView.autoScales = true
  }

  func loadDrawing(_ base64: String) {
    guard base64 != loadedDrawing else { return }
    loadedDrawing = base64
    if base64.isEmpty {
      canvas.drawing = PKDrawing()
    } else if let data = Data(base64Encoded: base64), let drawing = try? PKDrawing(data: data) {
      canvas.drawing = drawing
    }
    knownStrokeCount = canvas.drawing.strokes.count
  }

  func setTool(_ value: [String: Any]) {
    let kind = value["kind"] as? String ?? "pen"
    activeKind = kind
    scratchEnabled = value["scratchEnabled"] as? Bool ?? true
    shapeKind = kind == "shape" ? (value["shapeKind"] as? String ?? "line") : nil
    let width = (value["width"] as? NSNumber)?.doubleValue ?? 2
    let opacity = (value["opacity"] as? NSNumber)?.doubleValue ?? 1
    canvas.isRulerActive = value["rulerActive"] as? Bool ?? false
    if kind == "lasso" { canvas.tool = PKLassoTool(); return }
    if kind == "eraser" {
      let mode = value["eraserMode"] as? String ?? "vector"
      let eraserType: PKEraserTool.EraserType = mode == "bitmap" ? .bitmap : mode == "fixedWidthBitmap" ? .fixedWidthBitmap : .vector
      canvas.tool = PKEraserTool(eraserType)
      return
    }
    let inkType: PKInk.InkType
    switch kind {
    case "fountainPen": inkType = .fountainPen
    case "monoline": inkType = .monoline
    case "pencil": inkType = .pencil
    case "crayon": inkType = .crayon
    case "watercolor": inkType = .watercolor
    case "marker": inkType = .marker
    default: inkType = .pen
    }
    let color = UIColor(hanjiHex: value["color"] as? String ?? "#20201E").withAlphaComponent(opacity)
    canvas.tool = PKInkingTool(inkType, color: color, width: width)
  }

  func applyUndoSignal(_ value: Int) {
    if value != lastUndoSignal { lastUndoSignal = value; canvas.undoManager?.undo() }
  }

  func applyRedoSignal(_ value: Int) {
    if value != lastRedoSignal { lastRedoSignal = value; canvas.undoManager?.redo() }
  }

  @objc private func handleCanvasTap(_ recognizer: UITapGestureRecognizer) {
    let point = recognizer.location(in: canvas)
    let hit = canvas.drawing.strokes.reversed().first { $0.renderBounds.insetBy(dx: -14, dy: -14).contains(point) }
    if let hit { onStrokeTapped(["createdAt": hit.path.creationDate.timeIntervalSince1970]); return }
    guard let page = document?.page(at: currentPage) else { return }
    let pagePoint = pdfView.convert(point, to: page)
    guard let annotation = page.annotation(at: pagePoint), let action = annotation.action else { return }
    if let goTo = action as? PDFActionGoTo, let targetPage = goTo.destination.page, let document {
      let index = document.index(for: targetPage)
      if index != NSNotFound { onPdfLink(["pageIndex": index]); UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    } else if let urlAction = action as? PDFActionURL, let url = urlAction.url {
      onPdfLink(["url": url.absoluteString])
    }
  }

  func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
    if applyingShape { return }
    var strokes = canvasView.drawing.strokes
    if scratchEnabled, ["pen", "fountainPen", "monoline", "pencil", "crayon"].contains(activeKind), strokes.count > knownStrokeCount, let scratch = strokes.last, isScratchStroke(scratch) {
      let target = scratch.renderBounds.insetBy(dx: -8, dy: -8)
      let previous = strokes.dropLast(), survivors = previous.filter { !$0.renderBounds.intersects(target) }
      if survivors.count < previous.count {
        strokes = Array(survivors); applyingShape = true; canvasView.drawing = PKDrawing(strokes: strokes); applyingShape = false
        UINotificationFeedbackGenerator().notificationOccurred(.success)
      }
    }
    if let shapeKind, strokes.count > knownStrokeCount, let source = strokes.last {
      let replacements = makeShapeStrokes(source, kind: shapeKind)
      if !replacements.isEmpty {
        strokes.removeLast(); strokes.append(contentsOf: replacements)
        applyingShape = true; canvasView.drawing = PKDrawing(strokes: strokes); applyingShape = false
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
      }
    }
    if strokes.count > knownStrokeCount, let stroke = strokes.last {
      onStrokeAdded(["createdAt": stroke.path.creationDate.timeIntervalSince1970])
      if zoomWindowEnabled { autoAdvance(after: stroke) }
    }
    knownStrokeCount = strokes.count
    let value = canvasView.drawing.dataRepresentation().base64EncodedString()
    loadedDrawing = value
    onDrawingChange(["drawingData": value])
    onHistoryChange([
      "canUndo": canvasView.undoManager?.canUndo ?? false,
      "canRedo": canvasView.undoManager?.canRedo ?? false
    ])
  }

  func canvasViewDidEndUsingTool(_ canvasView: PKCanvasView) {
    if activeKind == "eraser" { onEraserEnded([:]) }
  }

  private func autoAdvance(after stroke: PKStroke) {
    let scale = max(canvas.zoomScale, 1), visibleWidth = canvas.bounds.width / scale, visibleHeight = canvas.bounds.height / scale
    let visibleX = canvas.contentOffset.x / scale
    guard stroke.renderBounds.maxX > visibleX + visibleWidth * 0.82 else { return }
    let maxOffsetX = max(0, canvas.contentSize.width * scale - canvas.bounds.width)
    let proposedX = canvas.contentOffset.x + canvas.bounds.width * 0.58
    if proposedX <= maxOffsetX {
      canvas.setContentOffset(CGPoint(x: proposedX, y: canvas.contentOffset.y), animated: true)
    } else {
      let maxOffsetY = max(0, canvas.contentSize.height * scale - canvas.bounds.height)
      let nextY = min(maxOffsetY, canvas.contentOffset.y + visibleHeight * scale * 0.72)
      canvas.setContentOffset(CGPoint(x: 0, y: nextY), animated: true)
    }
    UIImpactFeedbackGenerator(style: .soft).impactOccurred()
  }

  private func makeShapeStrokes(_ source: PKStroke, kind: String) -> [PKStroke] {
    guard source.path.count > 1 else { return [source] }
    var start = source.path[0].location, end = source.path[source.path.count - 1].location
    let angle = atan2(end.y - start.y, end.x - start.x), tolerance = CGFloat.pi / 60
    if kind == "line" && abs(sin(angle)) < sin(tolerance) { end.y = start.y }
    if kind == "line" && abs(cos(angle)) < sin(tolerance) { end.x = start.x }
    let left = min(start.x, end.x), top = min(start.y, end.y), width = max(abs(end.x - start.x), 2), height = max(abs(end.y - start.y), 2)
    let locations: [[CGPoint]]
    switch kind {
    case "arrow":
      let length = min(CGFloat(28), hypot(end.x - start.x, end.y - start.y) * 0.3)
      locations = [[start, end], [end, CGPoint(x: end.x - length * cos(angle - 0.55), y: end.y - length * sin(angle - 0.55))], [end, CGPoint(x: end.x - length * cos(angle + 0.55), y: end.y - length * sin(angle + 0.55))]]
    case "ellipse":
      locations = [(0...64).map { index in let t = CGFloat(index) / 64 * .pi * 2; return CGPoint(x: left + width / 2 + cos(t) * width / 2, y: top + height / 2 + sin(t) * height / 2) }]
    case "rectangle": locations = [[CGPoint(x:left,y:top),CGPoint(x:left+width,y:top),CGPoint(x:left+width,y:top+height),CGPoint(x:left,y:top+height),CGPoint(x:left,y:top)]]
    case "triangle": locations = [[CGPoint(x:left+width/2,y:top),CGPoint(x:left+width,y:top+height),CGPoint(x:left,y:top+height),CGPoint(x:left+width/2,y:top)]]
    default: locations = [[start, end]]
    }
    let prototype = source.path[0]
    return locations.map { points in
      let controls = points.enumerated().map { index, location in PKStrokePoint(location: location, timeOffset: TimeInterval(index) * 0.01, size: prototype.size, opacity: prototype.opacity, force: prototype.force, azimuth: prototype.azimuth, altitude: prototype.altitude) }
      return PKStroke(ink: source.ink, path: PKStrokePath(controlPoints: controls, creationDate: source.path.creationDate))
    }
  }

  private func isScratchStroke(_ stroke: PKStroke) -> Bool {
    guard stroke.path.count >= 8 else { return false }
    let horizontal = stroke.renderBounds.width >= stroke.renderBounds.height
    var reversals = 0, previousSign: CGFloat = 0, distance: CGFloat = 0
    var previous = stroke.path[0].location
    for index in 1..<stroke.path.count {
      let point = stroke.path[index].location, delta = horizontal ? point.x - previous.x : point.y - previous.y
      distance += hypot(point.x - previous.x, point.y - previous.y)
      if abs(delta) > 2 { let sign: CGFloat = delta > 0 ? 1 : -1; if previousSign != 0 && sign != previousSign { reversals += 1 }; previousSign = sign }
      previous = point
    }
    let diagonal = hypot(stroke.renderBounds.width, stroke.renderBounds.height)
    return reversals >= 4 && diagonal > 12 && distance > diagonal * 2.4
  }
}

extension UIColor {
  convenience init(hanjiHex: String) {
    var raw = hanjiHex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    if raw.count == 3 { raw = raw.map { "\($0)\($0)" }.joined() }
    var value: UInt64 = 0
    Scanner(string: raw).scanHexInt64(&value)
    self.init(
      red: CGFloat((value >> 16) & 255) / 255,
      green: CGFloat((value >> 8) & 255) / 255,
      blue: CGFloat(value & 255) / 255,
      alpha: 1
    )
  }
}
