import ExpoModulesCore
import PDFKit
import PencilKit
import Vision

public final class HanjiDocumentModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HanjiDocumentCanvas")
    View(HanjiDocumentView.self) {
      Events("onDrawingChange", "onCanvasMetrics", "onPageCount", "onPdfOutline", "onPdfLink", "onPdfExcerpt", "onPencilDoubleTap", "onPencilSqueeze", "onStrokeAdded", "onStrokeTapped", "onHistoryChange", "onEraserEnded", "onSelectionChange", "onSelectionText", "onSelectionClip", "onCircleLasso")
      Prop("pdfUri") { (view: HanjiDocumentView, uri: String?) in view.loadPDF(uri) }
      Prop("pageIndex") { (view: HanjiDocumentView, index: Int) in view.showPage(index) }
      Prop("drawingData") { (view: HanjiDocumentView, value: String) in view.loadDrawing(value) }
      Prop("fingerDrawingEnabled") { (view: HanjiDocumentView, value: Bool) in
        view.canvas.drawingPolicy = value ? .anyInput : .pencilOnly
      }
      Prop("twoFingerUndoEnabled") { (view: HanjiDocumentView, value: Bool) in view.twoFingerUndoTap.isEnabled = value }
      Prop("threeFingerRedoEnabled") { (view: HanjiDocumentView, value: Bool) in view.threeFingerRedoTap.isEnabled = value }
      Prop("tool") { (view: HanjiDocumentView, value: [String: Any]) in view.setTool(value) }
      Prop("undoSignal") { (view: HanjiDocumentView, value: Int) in view.applyUndoSignal(value) }
      Prop("redoSignal") { (view: HanjiDocumentView, value: Int) in view.applyRedoSignal(value) }
      Prop("zoomWindowEnabled") { (view: HanjiDocumentView, value: Bool) in view.setZoomWindow(value) }
      Prop("interactionEnabled") { (view: HanjiDocumentView, value: Bool) in view.canvas.isUserInteractionEnabled = value }
      Prop("replayCutoff") { (view: HanjiDocumentView, value: Double?) in view.setReplayCutoff(value) }
      Prop("selectionAction") { (view: HanjiDocumentView, value: [String: Any]?) in view.applySelectionAction(value) }
      Prop("selectedElementCount") { (view: HanjiDocumentView, value: Int) in view.selectedElementCount = value }
      AsyncFunction("getStrokes") { (view: HanjiDocumentView) in view.serializedStrokes() }
      AsyncFunction("replaceStrokes") { (view: HanjiDocumentView, ids: [String], replacements: [[String: Any]]) in
        view.replaceStrokes(ids: ids, replacements: replacements)
      }
      AsyncFunction("hitTest") { (view: HanjiDocumentView, point: [String: Double], radius: Double) in
        view.hitTestStroke(point: point, radius: radius)
      }
      AsyncFunction("getDrawingData") { (view: HanjiDocumentView) in view.canvas.drawing.dataRepresentation().base64EncodedString() }
      AsyncFunction("loadDrawingData") { (view: HanjiDocumentView, base64: String) in view.loadDrawing(base64) }
      AsyncFunction("renderImage") { (view: HanjiDocumentView, options: [String: Double]) throws in
        try view.renderDrawingImage(options)
      }
    }
  }
}

final class HanjiDocumentView: ExpoView, PKCanvasViewDelegate, UIPencilInteractionDelegate {
  let pdfView = PDFView()
  let canvas = PKCanvasView()
  let onDrawingChange = EventDispatcher()
  let onCanvasMetrics = EventDispatcher()
  let onPageCount = EventDispatcher()
  let onPdfOutline = EventDispatcher()
  let onPdfLink = EventDispatcher()
  let onPdfExcerpt = EventDispatcher()
  let onPencilDoubleTap = EventDispatcher()
  let onPencilSqueeze = EventDispatcher()
  let onStrokeAdded = EventDispatcher()
  let onStrokeTapped = EventDispatcher()
  let onHistoryChange = EventDispatcher()
  let onEraserEnded = EventDispatcher()
  let onSelectionChange = EventDispatcher()
  let onSelectionText = EventDispatcher()
  let onSelectionClip = EventDispatcher()
  let onCircleLasso = EventDispatcher()
  private var document: PDFDocument?
  private var currentPage = 0
  private var loadedDrawing = ""
  private var knownStrokeCount = 0
  private var lastUndoSignal = 0
  private var lastRedoSignal = 0
  private var shapeKind: String?
  private var shapeLineStyle = "solid"
  private var shapeFillStyle = "none"
  private var shapeHoldRequired = true
  private var applyingShape = false
  private var activeKind = "pen"
  private var activeInkColor = UIColor.black
  private var scratchEnabled = true
  private var circleToLasso = true
  private var markerStraightLine = true
  private var zoomWindowEnabled = false
  private var previousCanvasSize = CGSize.zero
  private var sourceDrawing = PKDrawing()
  private var replayCutoff: Double?
  private let selectionLayer = CAShapeLayer()
  private let pdfTextSelectionLayer = CAShapeLayer()
  private weak var pdfTextSelectionPage: PDFPage?
  private var pdfTextSelectionStart: CGPoint?
  private var selectionStart = CGPoint.zero
  private var selectedStrokeIndexes: [Int] = []
  private var lassoMode = "freeform"
  private var lassoInkEnabled = true
  var selectedElementCount = 0
  private var selectionPoints: [CGPoint] = []
  private var selectionBounds = CGRect.zero
  private var selectionMoveDrawing: PKDrawing?
  private var selectionMoveBounds = CGRect.zero
  private var clipboardPasteCount = 0
  private var lastSelectionAction = 0
  fileprivate lazy var twoFingerUndoTap: UITapGestureRecognizer = {
    let gesture = UITapGestureRecognizer(target: self, action: #selector(handleTwoFingerUndo))
    gesture.numberOfTouchesRequired = 2
    gesture.numberOfTapsRequired = 1
    gesture.allowedTouchTypes = [NSNumber(value: UITouch.TouchType.direct.rawValue)]
    gesture.cancelsTouchesInView = false
    return gesture
  }()
  fileprivate lazy var threeFingerRedoTap: UITapGestureRecognizer = {
    let gesture = UITapGestureRecognizer(target: self, action: #selector(handleThreeFingerRedo))
    gesture.numberOfTouchesRequired = 3
    gesture.numberOfTapsRequired = 1
    gesture.allowedTouchTypes = [NSNumber(value: UITouch.TouchType.direct.rawValue)]
    gesture.cancelsTouchesInView = false
    return gesture
  }()

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
    canvas.pinchGestureRecognizer?.isEnabled = false
    canvas.panGestureRecognizer.isEnabled = false
    let tap = UITapGestureRecognizer(target: self, action: #selector(handleCanvasTap(_:)))
    tap.cancelsTouchesInView = false
    tap.allowedTouchTypes = [NSNumber(value: UITouch.TouchType.direct.rawValue)]
    canvas.addGestureRecognizer(tap)
    canvas.addGestureRecognizer(twoFingerUndoTap)
    canvas.addGestureRecognizer(threeFingerRedoTap)
    let pdfTextPress = UILongPressGestureRecognizer(target: self, action: #selector(handlePDFTextPress(_:)))
    pdfTextPress.minimumPressDuration = 0.35
    pdfTextPress.allowableMovement = 12
    pdfTextPress.cancelsTouchesInView = false
    pdfTextPress.allowedTouchTypes = [NSNumber(value: UITouch.TouchType.direct.rawValue)]
    canvas.addGestureRecognizer(pdfTextPress)
    let pencilInteraction = UIPencilInteraction(); pencilInteraction.delegate = self; addInteraction(pencilInteraction)
    selectionLayer.fillColor = UIColor.systemTeal.withAlphaComponent(0.08).cgColor
    selectionLayer.strokeColor = UIColor.systemTeal.cgColor
    selectionLayer.lineWidth = 1.5
    selectionLayer.lineDashPattern = [6, 4]
    canvas.layer.addSublayer(selectionLayer)
    pdfTextSelectionLayer.fillColor = UIColor.systemYellow.withAlphaComponent(0.22).cgColor
    pdfTextSelectionLayer.strokeColor = UIColor.systemYellow.withAlphaComponent(0.65).cgColor
    pdfTextSelectionLayer.lineWidth = 1
    canvas.layer.addSublayer(pdfTextSelectionLayer)
    let selectionPan = UIPanGestureRecognizer(target: self, action: #selector(handleSelectionPan(_:)))
    selectionPan.allowedTouchTypes = [NSNumber(value: UITouch.TouchType.pencil.rawValue)]
    selectionPan.maximumNumberOfTouches = 1
    selectionPan.cancelsTouchesInView = true
    selectionPan.isEnabled = false
    selectionPan.name = "hanji-rectangle-selection"
    canvas.addGestureRecognizer(selectionPan)
    addSubview(pdfView)
    addSubview(canvas)
  }

  func serializedStrokes() -> [[String: Any]] {
    canvas.drawing.strokes.map { stroke in
      [
        "id": strokeIdentifier(stroke),
        "ink": stroke.ink.inkType.rawValue,
        "color": stroke.ink.color.hanjiHexWithAlpha,
        "createdAt": stroke.path.creationDate.timeIntervalSince1970,
        "points": (0..<stroke.path.count).map { pointIndex -> [String: Any] in
          let point = stroke.path[pointIndex]
          return [
            "x": point.location.x, "y": point.location.y, "t": point.timeOffset,
            "force": point.force, "azimuth": point.azimuth, "altitude": point.altitude,
            "width": point.size.width, "height": point.size.height, "opacity": point.opacity
          ]
        }
      ]
    }
  }

  func replaceStrokes(ids: [String], replacements: [[String: Any]]) -> Bool {
    let targets = Set(ids), current = canvas.drawing.strokes
    guard !targets.isEmpty, current.contains(where: { targets.contains(strokeIdentifier($0)) }) else { return false }
    let decoded = replacements.compactMap(makeStroke)
    guard decoded.count == replacements.count else { return false }
    let before = canvas.drawing
    var inserted = false, result: [PKStroke] = []
    for stroke in current {
      if targets.contains(strokeIdentifier(stroke)) {
        if !inserted { result.append(contentsOf: decoded); inserted = true }
      } else { result.append(stroke) }
    }
    registerTransformUndo(before)
    applyingShape = true
    canvas.drawing = PKDrawing(strokes: result)
    applyingShape = false
    sourceDrawing = canvas.drawing
    knownStrokeCount = result.count
    emitDrawingChange()
    return true
  }

  func hitTestStroke(point: [String: Double], radius: Double) -> String? {
    guard let x = point["x"], let y = point["y"] else { return nil }
    let target = CGPoint(x: x, y: y), threshold = CGFloat(max(1, radius))
    for stroke in canvas.drawing.strokes.reversed() {
      guard stroke.renderBounds.insetBy(dx: -threshold, dy: -threshold).contains(target) else { continue }
      for index in 0..<stroke.path.count {
        let sample = stroke.path[index]
        if hypot(sample.location.x - target.x, sample.location.y - target.y) <= threshold + max(sample.size.width, sample.size.height) / 2 {
          return strokeIdentifier(stroke)
        }
      }
    }
    return nil
  }

  private func strokeIdentifier(_ stroke: PKStroke) -> String {
    var hash: UInt64 = 1469598103934665603
    func mix(_ value: UInt64) { hash = (hash ^ value) &* 1099511628211 }
    mix(stroke.path.creationDate.timeIntervalSince1970.bitPattern)
    mix(UInt64(stroke.path.count))
    for index in 0..<stroke.path.count { mix(stroke.path[index].timeOffset.bitPattern) }
    return String(format: "%016llx", hash)
  }

  private func makeStroke(_ value: [String: Any]) -> PKStroke? {
    guard let points = value["points"] as? [[String: Any]], !points.isEmpty else { return nil }
    let inkName = value["ink"] as? String ?? "pen"
    let inkType: PKInk.InkType
    switch inkName {
    case PKInk.InkType.fountainPen.rawValue: inkType = .fountainPen
    case PKInk.InkType.monoline.rawValue: inkType = .monoline
    case PKInk.InkType.pencil.rawValue: inkType = .pencil
    case PKInk.InkType.crayon.rawValue: inkType = .crayon
    case PKInk.InkType.watercolor.rawValue: inkType = .watercolor
    case PKInk.InkType.marker.rawValue: inkType = .marker
    default: inkType = .pen
    }
    let color = UIColor(hanjiHex: value["color"] as? String ?? "#20201EFF")
    let controlPoints = points.compactMap { item -> PKStrokePoint? in
      guard let x = (item["x"] as? NSNumber)?.doubleValue, let y = (item["y"] as? NSNumber)?.doubleValue else { return nil }
      return PKStrokePoint(
        location: CGPoint(x: x, y: y), timeOffset: (item["t"] as? NSNumber)?.doubleValue ?? 0,
        size: CGSize(width: (item["width"] as? NSNumber)?.doubleValue ?? 2, height: (item["height"] as? NSNumber)?.doubleValue ?? 2),
        opacity: (item["opacity"] as? NSNumber)?.doubleValue ?? 1, force: (item["force"] as? NSNumber)?.doubleValue ?? 1,
        azimuth: (item["azimuth"] as? NSNumber)?.doubleValue ?? 0, altitude: (item["altitude"] as? NSNumber)?.doubleValue ?? .pi / 2
      )
    }
    guard controlPoints.count == points.count else { return nil }
    let createdAt = Date(timeIntervalSince1970: (value["createdAt"] as? NSNumber)?.doubleValue ?? Date().timeIntervalSince1970)
    return PKStroke(ink: PKInk(inkType, color: color), path: PKStrokePath(controlPoints: controlPoints, creationDate: createdAt))
  }

  private func emitDrawingChange() {
    let value = canvas.drawing.dataRepresentation().base64EncodedString()
    loadedDrawing = value
    onDrawingChange(["drawingData": value])
  }

  func pencilInteractionDidTap(_ interaction: UIPencilInteraction) {
    onPencilDoubleTap(["preferredAction": String(describing: UIPencilInteraction.preferredTapAction)])
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
  }

  @objc private func handleTwoFingerUndo() {
    guard canvas.undoManager?.canUndo == true else { return }
    canvas.undoManager?.undo()
    UIImpactFeedbackGenerator(style: .light).impactOccurred()
  }

  @objc private func handleThreeFingerRedo() {
    guard canvas.undoManager?.canRedo == true else { return }
    canvas.undoManager?.redo()
    UIImpactFeedbackGenerator(style: .light).impactOccurred()
  }

  @available(iOS 17.5, *)
  func pencilInteraction(_ interaction: UIPencilInteraction, didReceiveTap tap: UIPencilInteraction.Tap) {
    onPencilDoubleTap(["preferredAction": String(describing: UIPencilInteraction.preferredTapAction)])
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
  }

  @available(iOS 17.5, *)
  func pencilInteraction(_ interaction: UIPencilInteraction, didReceiveSqueeze squeeze: UIPencilInteraction.Squeeze) {
    if squeeze.phase == .began {
      onPencilSqueeze(["phase": "began", "preferredAction": String(describing: UIPencilInteraction.preferredSqueezeAction)])
      UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    } else if squeeze.phase == .ended || squeeze.phase == .cancelled {
      onPencilSqueeze(["phase": "ended", "preferredAction": String(describing: UIPencilInteraction.preferredSqueezeAction)])
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    pdfView.frame = bounds
    canvas.frame = bounds
    if canvas.contentSize.width < bounds.width || canvas.contentSize.height < bounds.height { canvas.contentSize = bounds.size }
    rescaleDrawingIfNeeded(to: bounds.size)
    if !zoomWindowEnabled { DispatchQueue.main.async { [weak self] in self?.emitCanvasMetrics() } }
  }

  private func rescaleDrawingIfNeeded(to size: CGSize) {
    guard size.width > 1, size.height > 1 else { return }
    defer { previousCanvasSize = size }
    guard previousCanvasSize.width > 1, previousCanvasSize.height > 1,
          abs(previousCanvasSize.width - size.width) > 0.5 || abs(previousCanvasSize.height - size.height) > 0.5,
          !sourceDrawing.strokes.isEmpty else { return }
    var scaled = sourceDrawing
    scaled.transform(using: CGAffineTransform(scaleX: size.width / previousCanvasSize.width, y: size.height / previousCanvasSize.height))
    applyingShape = true
    canvas.drawing = scaled
    applyingShape = false
    sourceDrawing = scaled
    knownStrokeCount = scaled.strokes.count
    let encoded = scaled.dataRepresentation().base64EncodedString()
    loadedDrawing = encoded
    onDrawingChange(["drawingData": encoded])
  }

  private func emitCanvasMetrics() {
    guard canvas.bounds.width > 0, canvas.bounds.height > 0 else { return }
    var viewport = canvas.bounds
    if let page = document?.page(at: currentPage) {
      pdfView.layoutDocumentView()
      let pageRect = pdfView.convert(page.bounds(for: .mediaBox), from: page)
      let converted = canvas.convert(pageRect, from: pdfView).intersection(canvas.bounds)
      if !converted.isNull, converted.width > 1, converted.height > 1 { viewport = converted }
    }
    onCanvasMetrics([
      "x": viewport.minX, "y": viewport.minY,
      "width": viewport.width, "height": viewport.height,
      "canvasWidth": canvas.bounds.width, "canvasHeight": canvas.bounds.height
    ])
  }

  private var selectionPan: UIPanGestureRecognizer? { canvas.gestureRecognizers?.compactMap { $0 as? UIPanGestureRecognizer }.first { $0.name == "hanji-rectangle-selection" } }

  func setZoomWindow(_ enabled: Bool) {
    guard enabled != zoomWindowEnabled else { return }
    zoomWindowEnabled = enabled
    canvas.minimumZoomScale = 1
    canvas.maximumZoomScale = enabled ? 5 : 1
    canvas.pinchGestureRecognizer?.isEnabled = enabled
    canvas.panGestureRecognizer.isEnabled = enabled
    canvas.setZoomScale(enabled ? 2.5 : 1, animated: true)
    if !enabled { canvas.setContentOffset(.zero, animated: true) }
  }

  func loadPDF(_ uri: String?) {
    clearPDFTextSelection()
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
    clearPDFTextSelection()
    currentPage = max(0, index)
    guard let page = document?.page(at: currentPage) else { return }
    pdfView.go(to: page)
    pdfView.autoScales = true
    DispatchQueue.main.async { [weak self] in self?.emitCanvasMetrics() }
  }

  @discardableResult func loadDrawing(_ base64: String) -> Bool {
    guard base64 != loadedDrawing else { return true }
    clearPDFTextSelection()
    let drawing: PKDrawing
    if base64.isEmpty {
      drawing = PKDrawing()
    } else if let data = Data(base64Encoded: base64), let drawing = try? PKDrawing(data: data) {
      sourceDrawing = drawing
      loadedDrawing = base64
      renderReplay()
      knownStrokeCount = canvas.drawing.strokes.count
      return true
    } else { return false }
    sourceDrawing = drawing
    loadedDrawing = base64
    renderReplay()
    knownStrokeCount = canvas.drawing.strokes.count
    return true
  }

  func renderDrawingImage(_ options: [String: Double]) throws -> String {
    let scale = CGFloat(min(6, max(0.5, options["scale"] ?? 3)))
    let rect: CGRect
    if let x = options["x"], let y = options["y"], let width = options["width"], let height = options["height"], width > 0, height > 0 {
      rect = CGRect(x: x, y: y, width: width, height: height)
    } else { rect = canvas.bounds }
    guard rect.width > 0, rect.height > 0, let data = canvas.drawing.image(from: rect, scale: scale).pngData() else {
      throw NSError(domain: "HanjiDocumentCanvas", code: 2, userInfo: [NSLocalizedDescriptionKey: "필기 이미지를 만들 수 없습니다."])
    }
    return data.base64EncodedString()
  }

  func setReplayCutoff(_ cutoff: Double?) {
    clearPDFTextSelection()
    replayCutoff = cutoff
    renderReplay()
  }

  private func renderReplay() {
    let drawing: PKDrawing
    if let cutoff = replayCutoff {
      drawing = PKDrawing(strokes: sourceDrawing.strokes.filter { $0.path.creationDate.timeIntervalSince1970 <= cutoff })
    } else {
      drawing = sourceDrawing
    }
    applyingShape = true
    canvas.drawing = drawing
    applyingShape = false
  }

  func setTool(_ value: [String: Any]) {
    let kind = value["kind"] as? String ?? "pen"
    if kind != activeKind { clearPDFTextSelection() }
    activeKind = kind
    selectionPan?.isEnabled = kind == "lasso"
    if kind != "lasso" { clearSelection() }
    scratchEnabled = value["scratchEnabled"] as? Bool ?? true
    circleToLasso = value["circleToLasso"] as? Bool ?? true
    lassoMode = value["lassoMode"] as? String ?? "freeform"
    lassoInkEnabled = value["lassoInk"] as? Bool ?? true
    markerStraightLine = value["markerStraightLine"] as? Bool ?? true
    shapeKind = kind == "shape" ? (value["shapeKind"] as? String ?? "line") : nil
    shapeLineStyle = value["shapeLineStyle"] as? String ?? "solid"
    shapeFillStyle = value["shapeFillStyle"] as? String ?? "none"
    shapeHoldRequired = value["shapeHoldRequired"] as? Bool ?? true
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
    activeInkColor = color
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
    if let hit { onStrokeTapped(["id": strokeIdentifier(hit), "createdAt": hit.path.creationDate.timeIntervalSince1970]); return }
    let pdfPoint = canvas.convert(point, to: pdfView)
    guard let page = pdfView.page(for: pdfPoint, nearest: false) else { return }
    let pagePoint = pdfView.convert(pdfPoint, to: page)
    guard let annotation = page.annotation(at: pagePoint), let action = annotation.action else { return }
    if let goTo = action as? PDFActionGoTo, let targetPage = goTo.destination.page, let document {
      let index = document.index(for: targetPage)
      if index != NSNotFound { onPdfLink(["pageIndex": index]); UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    } else if let urlAction = action as? PDFActionURL, let url = urlAction.url {
      onPdfLink(["url": url.absoluteString])
    }
  }

  @objc private func handlePDFTextPress(_ recognizer: UILongPressGestureRecognizer) {
    guard (activeKind == "marker" || activeKind == "lasso"), replayCutoff == nil, let document else { clearPDFTextSelection(); return }
    let canvasPoint = recognizer.location(in: canvas), pdfPoint = canvas.convert(canvasPoint, to: pdfView)
    guard let page = pdfView.page(for: pdfPoint, nearest: false) else {
      if recognizer.state == .ended || recognizer.state == .cancelled || recognizer.state == .failed { clearPDFTextSelection() }
      return
    }
    let pagePoint = pdfView.convert(pdfPoint, to: page)
    if activeKind == "lasso" {
      guard recognizer.state == .began, let selection = page.selectionForWord(at: pagePoint) else { return }
      let text = selection.string?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      guard !text.isEmpty else { return }
      onPdfExcerpt(["text": text, "pageIndex": document.index(for: page)])
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      return
    }
    switch recognizer.state {
    case .began:
      pdfTextSelectionPage = page
      pdfTextSelectionStart = pagePoint
      if let selection = page.selectionForWord(at: pagePoint) { showPDFTextSelection(selection, page: page) }
    case .changed:
      guard page === pdfTextSelectionPage, let start = pdfTextSelectionStart,
            let selection = page.selection(from: start, to: pagePoint) else { return }
      showPDFTextSelection(selection, page: page)
    case .ended:
      guard page === pdfTextSelectionPage, let start = pdfTextSelectionStart else { clearPDFTextSelection(); return }
      let selection = page.selection(from: start, to: pagePoint) ?? page.selectionForWord(at: start)
      if let selection { commitPDFTextSelection(selection, page: page) }
      clearPDFTextSelection()
    case .cancelled, .failed:
      clearPDFTextSelection()
    default: break
    }
  }

  private func pdfTextLineRects(_ selection: PDFSelection, page: PDFPage) -> [CGRect] {
    selection.selectionsByLine().compactMap { line in
      let bounds = line.bounds(for: page)
      guard !bounds.isNull, bounds.width > 1, bounds.height > 1 else { return nil }
      let pdfBounds = pdfView.convert(bounds, from: page)
      return canvas.convert(pdfBounds, from: pdfView).insetBy(dx: -1.5, dy: 0)
    }
  }

  private func showPDFTextSelection(_ selection: PDFSelection, page: PDFPage) {
    let path = UIBezierPath()
    pdfTextLineRects(selection, page: page).forEach { path.append(UIBezierPath(roundedRect: $0, cornerRadius: 2)) }
    pdfTextSelectionLayer.path = path.cgPath
  }

  private func commitPDFTextSelection(_ selection: PDFSelection, page: PDFPage) {
    let strokes = pdfTextLineRects(selection, page: page).compactMap { rect -> PKStroke? in
      let thickness = max(3, rect.height * 0.72), y = rect.midY
      guard rect.width > thickness else { return nil }
      let points = [
        PKStrokePoint(location: CGPoint(x: rect.minX + thickness / 2, y: y), timeOffset: 0, size: CGSize(width: thickness, height: thickness), opacity: 1, force: 1, azimuth: 0, altitude: .pi / 2),
        PKStrokePoint(location: CGPoint(x: rect.maxX - thickness / 2, y: y), timeOffset: 0.01, size: CGSize(width: thickness, height: thickness), opacity: 1, force: 1, azimuth: 0, altitude: .pi / 2)
      ]
      return PKStroke(ink: PKInk(.marker, color: activeInkColor), path: PKStrokePath(controlPoints: points, creationDate: Date()))
    }
    guard !strokes.isEmpty else { return }
    let original = canvas.drawing
    registerTransformUndo(original)
    replaceDrawing(PKDrawing(strokes: original.strokes + strokes))
    UINotificationFeedbackGenerator().notificationOccurred(.success)
  }

  private func clearPDFTextSelection() {
    pdfTextSelectionPage = nil
    pdfTextSelectionStart = nil
    pdfTextSelectionLayer.path = nil
  }

  @objc private func handleSelectionPan(_ recognizer: UIPanGestureRecognizer) {
    let point = recognizer.location(in: canvas)
    switch recognizer.state {
    case .began:
      if (!selectedStrokeIndexes.isEmpty || selectedElementCount > 0), selectionBounds.insetBy(dx: -12, dy: -12).contains(point) {
        selectionMoveDrawing = canvas.drawing
        selectionMoveBounds = selectionBounds
        recognizer.setTranslation(.zero, in: canvas)
        selectionLayer.fillColor = UIColor.systemTeal.withAlphaComponent(0.14).cgColor
        return
      }
      selectionStart = point
      selectionPoints = [point]
      selectedStrokeIndexes = []
    case .changed:
      if let original = selectionMoveDrawing {
        let translation = recognizer.translation(in: canvas)
        let selected = Set(selectedStrokeIndexes)
        let moved = original.strokes.enumerated().map { selected.contains($0.offset) ? offsetStroke($0.element, dx: translation.x, dy: translation.y) : $0.element }
        applyingShape = true; canvas.drawing = PKDrawing(strokes: moved); applyingShape = false
        selectionBounds = selectionMoveBounds.offsetBy(dx: translation.x, dy: translation.y)
        selectionLayer.path = UIBezierPath(rect: selectionBounds).cgPath
        emitSelection(moving: true)
        return
      }
      if lassoMode == "rectangle" {
        selectionBounds = CGRect(x: min(selectionStart.x, point.x), y: min(selectionStart.y, point.y), width: abs(point.x - selectionStart.x), height: abs(point.y - selectionStart.y))
        selectionLayer.path = UIBezierPath(rect: selectionBounds).cgPath
      } else if selectionPoints.last.map({ hypot($0.x-point.x,$0.y-point.y)>2 }) ?? true {
        selectionPoints.append(point)
        let path = freeformSelectionPath()
        selectionBounds = path.bounds
        selectionLayer.path = path.cgPath
      }
    case .ended:
      if let original = selectionMoveDrawing {
        let finalDrawing = canvas.drawing
        selectionMoveDrawing = nil
        selectionLayer.fillColor = UIColor.systemTeal.withAlphaComponent(0.08).cgColor
        if finalDrawing.dataRepresentation() != original.dataRepresentation() { registerTransformUndo(original) }
        replaceDrawing(finalDrawing)
        emitSelection(); UIImpactFeedbackGenerator(style: .light).impactOccurred()
        return
      }
      let freeformPath = lassoMode == "freeform" ? freeformSelectionPath() : nil
      selectedStrokeIndexes = lassoInkEnabled ? canvas.drawing.strokes.enumerated().compactMap { index, stroke in
        guard selectionBounds.intersects(stroke.renderBounds) else { return nil }
        if let freeformPath { return strokeIntersectsSelection(stroke, path: freeformPath) ? index : nil }
        return index
      } : []
      if selectedStrokeIndexes.isEmpty && selectionBounds.width < 2 && selectionBounds.height < 2 { clearSelection(); return }
      selectionLayer.path = UIBezierPath(rect: selectionBounds).cgPath
      emitSelection()
      UIImpactFeedbackGenerator(style: .light).impactOccurred()
    case .cancelled, .failed:
      if let original = selectionMoveDrawing {
        selectionMoveDrawing = nil
        selectionLayer.fillColor = UIColor.systemTeal.withAlphaComponent(0.08).cgColor
        replaceDrawing(original)
        selectionBounds = selectionMoveBounds
        selectionLayer.path = UIBezierPath(rect: selectionBounds).cgPath
        emitSelection(cancelled: true)
      } else { clearSelection() }
    default: break
    }
  }

  private func freeformSelectionPath() -> UIBezierPath {
    let path = UIBezierPath(); guard let first = selectionPoints.first else { return path }
    path.move(to:first); for point in selectionPoints.dropFirst(){path.addLine(to:point)}; path.close(); return path
  }

  private func strokeIntersectsSelection(_ stroke:PKStroke,path:UIBezierPath)->Bool {
    if path.contains(CGPoint(x:stroke.renderBounds.midX,y:stroke.renderBounds.midY)){return true}
    for index in 0..<stroke.path.count where path.contains(stroke.path[index].location){return true}
    let corners=[CGPoint(x:stroke.renderBounds.minX,y:stroke.renderBounds.minY),CGPoint(x:stroke.renderBounds.maxX,y:stroke.renderBounds.minY),CGPoint(x:stroke.renderBounds.maxX,y:stroke.renderBounds.maxY),CGPoint(x:stroke.renderBounds.minX,y:stroke.renderBounds.maxY)]
    return corners.contains(where:path.contains)
  }

  private func emitSelection(moving: Bool = false, cancelled: Bool = false) {
    let width = max(canvas.bounds.width, 1), height = max(canvas.bounds.height, 1)
    onSelectionChange(["count": selectedStrokeIndexes.count, "x": selectionBounds.minX / width, "y": selectionBounds.minY / height, "width": selectionBounds.width / width, "height": selectionBounds.height / height, "moving": moving, "moveCancelled": cancelled])
  }

  private func clearSelection() {
    selectionMoveDrawing = nil
    selectedStrokeIndexes = []
    selectionBounds = .zero
    selectionPoints = []
    selectionLayer.path = nil
    onSelectionChange(["count": 0])
  }

  func applySelectionAction(_ value: [String: Any]?) {
    guard let value, let nonce = (value["nonce"] as? NSNumber)?.intValue, nonce != lastSelectionAction else { return }
    lastSelectionAction = nonce
    let action = value["type"] as? String ?? ""
    if action == "clear" { clearSelection(); return }
    if action == "paste" {
      guard let data = UIPasteboard.general.data(forPasteboardType: "app.hanji.pkdrawing"), let pasted = try? PKDrawing(data: data), !pasted.strokes.isEmpty else {
        UINotificationFeedbackGenerator().notificationOccurred(.error); return
      }
      let original = canvas.drawing
      clipboardPasteCount += 1
      let distance = CGFloat(18 * clipboardPasteCount)
      let copiedAt = Date()
      let inserted = pasted.strokes.enumerated().map { index, stroke in
        offsetStroke(stroke, dx: distance, dy: distance, creationDate: copiedAt.addingTimeInterval(Double(index) * 0.000001))
      }
      registerTransformUndo(original)
      let first = original.strokes.count
      replaceDrawing(PKDrawing(strokes: original.strokes + inserted))
      selectedStrokeIndexes = Array(first..<(first + inserted.count))
      selectionBounds = PKDrawing(strokes: inserted).bounds
      selectionLayer.path = UIBezierPath(rect: selectionBounds).cgPath
      emitSelection(); UINotificationFeedbackGenerator().notificationOccurred(.success)
      return
    }
    guard !selectedStrokeIndexes.isEmpty else { return }
    if action == "copy" {
      copySelectionToPasteboard()
      return
    }
    if action == "clip" || action == "imageFlashcard" { createSelectionClip(); return }
    if action == "duplicate" {
      let original = canvas.drawing, copiedAt = Date()
      let chosen = original.strokes.enumerated().compactMap { selectedStrokeIndexes.contains($0.offset) ? offsetStroke($0.element, dx: 18, dy: 18, creationDate: copiedAt.addingTimeInterval(Double($0.offset) * 0.000001)) : nil }
      guard !chosen.isEmpty else { return }
      registerTransformUndo(original)
      let first = original.strokes.count
      replaceDrawing(PKDrawing(strokes: original.strokes + chosen))
      selectedStrokeIndexes = Array(first..<(first + chosen.count))
      selectionBounds = selectionBounds.offsetBy(dx: 18, dy: 18)
      selectionLayer.path = UIBezierPath(rect: selectionBounds).cgPath
      emitSelection(); UIImpactFeedbackGenerator(style: .light).impactOccurred()
      return
    }
    if action == "text" || action == "flashcard" { recognizeSelection(); return }
    let original = canvas.drawing, selected = Set(selectedStrokeIndexes), strokes = original.strokes
    if action == "shrink" || action == "grow" || action == "rotate" {
      let center = CGPoint(x: selectionBounds.midX, y: selectionBounds.midY)
      let scale = action == "shrink" ? CGFloat(0.8) : action == "grow" ? CGFloat(1.25) : CGFloat(1)
      let angle = action == "rotate" ? CGFloat.pi / 2 : CGFloat(0)
      let transformed = strokes.enumerated().map { selected.contains($0.offset) ? transformStroke($0.element, center: center, scale: scale, angle: angle) : $0.element }
      registerTransformUndo(original)
      replaceDrawing(PKDrawing(strokes: transformed))
      let chosen = transformed.enumerated().compactMap { selected.contains($0.offset) ? $0.element : nil }
      selectionBounds = PKDrawing(strokes: chosen).bounds
      selectionLayer.path = UIBezierPath(rect: selectionBounds).cgPath
      emitSelection(); UIImpactFeedbackGenerator(style: .light).impactOccurred()
      return
    }
    var changed: [PKStroke]
    if action == "delete" || action == "cut" {
      if action == "cut" { copySelectionToPasteboard() }
      changed = strokes.enumerated().compactMap { selected.contains($0.offset) ? nil : $0.element }
    } else if action == "recolor" {
      let color = UIColor(hanjiHex: value["color"] as? String ?? "#20201E")
      changed = strokes.enumerated().map { index, stroke in
        guard selected.contains(index) else { return stroke }
        return PKStroke(ink: PKInk(stroke.ink.inkType, color: color.withAlphaComponent(stroke.ink.color.cgColor.alpha)), path: stroke.path)
      }
    } else { return }
    registerTransformUndo(original)
    replaceDrawing(PKDrawing(strokes: changed))
    clearSelection()
  }

  private func copySelectionToPasteboard() {
    let chosen = canvas.drawing.strokes.enumerated().compactMap { selectedStrokeIndexes.contains($0.offset) ? $0.element : nil }
    let drawing = PKDrawing(strokes: chosen), bounds = drawing.bounds.insetBy(dx: -10, dy: -10)
    let nativeData = drawing.dataRepresentation()
    if let png = drawing.image(from: bounds, scale: 3).pngData() {
      UIPasteboard.general.setItems([["app.hanji.pkdrawing": nativeData, "public.png": png]], options: [:])
    } else { UIPasteboard.general.setData(nativeData, forPasteboardType: "app.hanji.pkdrawing") }
    clipboardPasteCount = 0
    UINotificationFeedbackGenerator().notificationOccurred(.success)
  }

  private func createSelectionClip() {
    let chosen = canvas.drawing.strokes.enumerated().compactMap { selectedStrokeIndexes.contains($0.offset) ? $0.element : nil }
    let drawing = PKDrawing(strokes: chosen)
    guard !drawing.strokes.isEmpty else { return }
    let bounds = drawing.bounds.insetBy(dx: -10, dy: -10)
    guard let png = drawing.image(from: bounds, scale: 3).pngData(), let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
      UINotificationFeedbackGenerator().notificationOccurred(.error); return
    }
    let directory = documents.appendingPathComponent("Hanji/assets/clips", isDirectory: true)
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      let file = directory.appendingPathComponent("clip-\(UUID().uuidString).png")
      try png.write(to: file, options: .atomic)
      let width = max(canvas.bounds.width, 1), height = max(canvas.bounds.height, 1)
      let x = min(width, max(0, bounds.minX)), y = min(height, max(0, bounds.minY))
      onSelectionClip(["uri": file.absoluteString, "x": x / width, "y": y / height, "width": max(1, min(width - x, bounds.width)) / width, "height": max(1, min(height - y, bounds.height)) / height])
      UIImpactFeedbackGenerator(style: .light).impactOccurred()
    } catch { UINotificationFeedbackGenerator().notificationOccurred(.error) }
  }

  private func recognizeSelection() {
    let strokes = canvas.drawing.strokes, selected = Set(selectedStrokeIndexes), chosen = strokes.enumerated().compactMap { selected.contains($0.offset) ? $0.element : nil }
    guard !chosen.isEmpty else { return }
    let drawing = PKDrawing(strokes: chosen), bounds = drawing.bounds.insetBy(dx: -12, dy: -12)
    guard let image = drawing.image(from: bounds, scale: 3).cgImage else { return }
    let request = VNRecognizeTextRequest { [weak self] request, _ in
      guard let self else { return }
      let text = (request.results as? [VNRecognizedTextObservation])?.compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ") ?? ""
      guard !text.isEmpty else { return }
      DispatchQueue.main.async {
        let original = self.canvas.drawing
        let remaining = original.strokes.enumerated().compactMap { selected.contains($0.offset) ? nil : $0.element }
        self.registerTransformUndo(original)
        self.replaceDrawing(PKDrawing(strokes: remaining))
        let width = max(self.canvas.bounds.width, 1), height = max(self.canvas.bounds.height, 1)
        self.onSelectionText(["text": text, "x": self.selectionBounds.minX / width, "y": self.selectionBounds.minY / height, "width": self.selectionBounds.width / width, "height": self.selectionBounds.height / height])
        self.clearSelection()
      }
    }
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["ko-KR", "en-US"]
    request.usesLanguageCorrection = true
    DispatchQueue.global(qos: .userInitiated).async { try? VNImageRequestHandler(cgImage: image).perform([request]) }
  }

  private func replaceDrawing(_ drawing: PKDrawing) {
    applyingShape = true; canvas.drawing = drawing; applyingShape = false
    sourceDrawing = drawing; knownStrokeCount = drawing.strokes.count
    let encoded = drawing.dataRepresentation().base64EncodedString(); loadedDrawing = encoded
    onDrawingChange(["drawingData": encoded])
  }

  private func offsetStroke(_ stroke: PKStroke, dx: CGFloat, dy: CGFloat, creationDate: Date? = nil) -> PKStroke {
    let controls = (0..<stroke.path.count).map { index in
      let point = stroke.path[index]
      return PKStrokePoint(location: CGPoint(x: point.location.x + dx, y: point.location.y + dy), timeOffset: point.timeOffset, size: point.size, opacity: point.opacity, force: point.force, azimuth: point.azimuth, altitude: point.altitude)
    }
    return PKStroke(ink: stroke.ink, path: PKStrokePath(controlPoints: controls, creationDate: creationDate ?? stroke.path.creationDate))
  }

  private func transformStroke(_ stroke: PKStroke, center: CGPoint, scale: CGFloat, angle: CGFloat) -> PKStroke {
    let cosine = cos(angle), sine = sin(angle)
    let controls = (0..<stroke.path.count).map { index in
      let point = stroke.path[index]
      let x = (point.location.x - center.x) * scale, y = (point.location.y - center.y) * scale
      let location = CGPoint(x: center.x + x * cosine - y * sine, y: center.y + x * sine + y * cosine)
      let size = CGSize(width: max(0.1, point.size.width * scale), height: max(0.1, point.size.height * scale))
      return PKStrokePoint(location: location, timeOffset: point.timeOffset, size: size, opacity: point.opacity, force: point.force, azimuth: point.azimuth + angle, altitude: point.altitude)
    }
    return PKStroke(ink: stroke.ink, path: PKStrokePath(controlPoints: controls, creationDate: stroke.path.creationDate))
  }

  func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
    if applyingShape { return }
    var strokes = canvasView.drawing.strokes
    if circleToLasso, ["pen", "fountainPen", "monoline", "pencil"].contains(activeKind), strokes.count > knownStrokeCount, let gesture = strokes.last, let indexes = circleLassoTargets(gesture, in: Array(strokes.dropLast())), !indexes.isEmpty {
      strokes.removeLast()
      applyingShape = true; canvasView.drawing = PKDrawing(strokes: strokes); applyingShape = false
      sourceDrawing = canvasView.drawing; knownStrokeCount = strokes.count
      selectionBounds = gesture.renderBounds.insetBy(dx: -4, dy: -4)
      selectedStrokeIndexes = indexes
      let encoded = canvasView.drawing.dataRepresentation().base64EncodedString(); loadedDrawing = encoded
      onDrawingChange(["drawingData": encoded]); emitSelection(); onCircleLasso(["count": indexes.count])
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      return
    }
    if scratchEnabled, ["pen", "fountainPen", "monoline", "pencil", "crayon"].contains(activeKind), strokes.count > knownStrokeCount, let scratch = strokes.last, isScratchStroke(scratch) {
      let target = scratch.renderBounds.insetBy(dx: -8, dy: -8)
      let previous = strokes.dropLast(), survivors = previous.filter { !$0.renderBounds.intersects(target) }
      if survivors.count < previous.count {
        registerTransformUndo(canvasView.drawing)
        strokes = Array(survivors); applyingShape = true; canvasView.drawing = PKDrawing(strokes: strokes); applyingShape = false
        UINotificationFeedbackGenerator().notificationOccurred(.success)
      }
    }
    if let shapeKind, strokes.count > knownStrokeCount, let source = strokes.last, !shapeHoldRequired || heldAtEnd(source) {
      let replacements = makeShapeStrokes(source, kind: shapeKind, dashed: shapeLineStyle == "dashed", fill: shapeFillStyle, connectingTo: Array(strokes.dropLast()))
      if !replacements.isEmpty {
        registerTransformUndo(canvasView.drawing)
        strokes.removeLast(); strokes.append(contentsOf: replacements)
        applyingShape = true; canvasView.drawing = PKDrawing(strokes: strokes); applyingShape = false
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
      }
    }
    if activeKind == "marker", markerStraightLine, strokes.count > knownStrokeCount, let source = strokes.last, heldAtEnd(source) {
      let replacement = makeShapeStrokes(source, kind: "line")
      if let line = replacement.first {
        registerTransformUndo(canvasView.drawing)
        strokes.removeLast(); strokes.append(line)
        applyingShape = true; canvasView.drawing = PKDrawing(strokes: strokes); applyingShape = false
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
      }
    }
    if strokes.count > knownStrokeCount, let stroke = strokes.last {
      onStrokeAdded(["id": strokeIdentifier(stroke), "createdAt": stroke.path.creationDate.timeIntervalSince1970])
      if zoomWindowEnabled { autoAdvance(after: stroke) }
    }
    knownStrokeCount = strokes.count
    sourceDrawing = canvasView.drawing
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

  private func makeShapeStrokes(_ source: PKStroke, kind: String, dashed: Bool = false, fill: String = "none", connectingTo previous: [PKStroke] = []) -> [PKStroke] {
    guard source.path.count > 1 else { return [source] }
    var start = source.path[0].location, end = source.path[source.path.count - 1].location
    if kind == "line" || kind == "arrow" {
      let threshold = max(CGFloat(12), min(CGFloat(24), source.path[0].size.width * 4))
      let anchors = previous.filter { $0.path.count <= 8 }.flatMap { stroke in
        (0..<stroke.path.count).map { stroke.path[$0].location }
      }
      start = nearestAnchor(to: start, in: anchors, threshold: threshold) ?? start
      let snappedEnd = nearestAnchor(to: end, in: anchors, threshold: threshold) ?? end
      if hypot(snappedEnd.x - start.x, snappedEnd.y - start.y) > threshold * 0.5 { end = snappedEnd }
    }
    let angle = atan2(end.y - start.y, end.x - start.x), tolerance = CGFloat.pi / 60
    if kind == "line" && abs(sin(angle)) < sin(tolerance) { end.y = start.y }
    if kind == "line" && abs(cos(angle)) < sin(tolerance) { end.x = start.x }
    var left = min(start.x, end.x), top = min(start.y, end.y), width = max(abs(end.x - start.x), 2), height = max(abs(end.y - start.y), 2)
    let locations: [[CGPoint]]
    switch kind {
    case "arrow":
      let length = min(CGFloat(28), hypot(end.x - start.x, end.y - start.y) * 0.3)
      locations = [[start, end], [end, CGPoint(x: end.x - length * cos(angle - 0.55), y: end.y - length * sin(angle - 0.55))], [end, CGPoint(x: end.x - length * cos(angle + 0.55), y: end.y - length * sin(angle + 0.55))]]
    case "ellipse":
      locations = [(0...64).map { index in let t = CGFloat(index) / 64 * .pi * 2; return CGPoint(x: left + width / 2 + cos(t) * width / 2, y: top + height / 2 + sin(t) * height / 2) }]
    case "rectangle": locations = [[CGPoint(x:left,y:top),CGPoint(x:left+width,y:top),CGPoint(x:left+width,y:top+height),CGPoint(x:left,y:top+height),CGPoint(x:left,y:top)]]
    case "triangle": locations = [[CGPoint(x:left+width/2,y:top),CGPoint(x:left+width,y:top+height),CGPoint(x:left,y:top+height),CGPoint(x:left+width/2,y:top)]]
    case "polygon":
      let raw = (0..<source.path.count).map { source.path[$0].location }
      var polygon = simplifyShapePath(raw, epsilon: max(3, source.path[0].size.width * 0.75))
      if polygon.count < 3 { return [source] }
      left = polygon.map(\.x).min() ?? left; top = polygon.map(\.y).min() ?? top
      width = max(2, (polygon.map(\.x).max() ?? left) - left); height = max(2, (polygon.map(\.y).max() ?? top) - top)
      if let first = polygon.first { polygon.append(first) }
      locations = [polygon]
    default: locations = [[start, end]]
    }
    let prototype = source.path[0]
    let paths = dashed ? locations.flatMap { dashedPaths($0) } : locations
    let outlines = paths.map { points in
      let controls = points.enumerated().map { index, location in PKStrokePoint(location: location, timeOffset: TimeInterval(index) * 0.01, size: prototype.size, opacity: prototype.opacity, force: prototype.force, azimuth: prototype.azimuth, altitude: prototype.altitude) }
      return PKStroke(ink: source.ink, path: PKStrokePath(controlPoints: controls, creationDate: source.path.creationDate))
    }
    guard fill != "none", ["ellipse", "rectangle", "triangle", "polygon"].contains(kind) else { return outlines }
    let fillAlpha: CGFloat = fill == "solid" ? 0.72 : 0.20
    let fillInk = PKInk(source.ink.inkType, color: source.ink.color.withAlphaComponent(source.ink.color.cgColor.alpha * fillAlpha))
    let spacing = max(CGFloat(3), min(CGFloat(10), prototype.size.height * 0.85))
    let fillSize = CGSize(width: max(prototype.size.width, spacing * 1.35), height: max(prototype.size.height, spacing * 1.35))
    var fills: [PKStroke] = [], y = top + spacing
    while y < top + height - spacing / 2 {
      let progress = max(CGFloat(0), min(CGFloat(1), (y - top) / height))
      var x1 = left, x2 = left + width
      if kind == "polygon" {
        let polygon = Array(locations[0].dropLast()), intersections = polygon.enumerated().compactMap { index, start -> CGFloat? in
          let end = polygon[(index + 1) % polygon.count]
          guard (start.y <= y && end.y > y) || (end.y <= y && start.y > y) else { return nil }
          return start.x + (y - start.y) * (end.x - start.x) / (end.y - start.y)
        }.sorted()
        for pair in stride(from: 0, to: intersections.count - 1, by: 2) where intersections[pair + 1] - intersections[pair] > spacing {
          let points = [CGPoint(x:intersections[pair],y:y),CGPoint(x:intersections[pair+1],y:y)].enumerated().map { index, location in PKStrokePoint(location: location, timeOffset: TimeInterval(index) * 0.01, size: fillSize, opacity: 1, force: prototype.force, azimuth: prototype.azimuth, altitude: prototype.altitude) }
          fills.append(PKStroke(ink: fillInk, path: PKStrokePath(controlPoints: points, creationDate: source.path.creationDate)))
        }
        y += spacing; continue
      } else if kind == "ellipse" {
        let normalized = (y - (top + height / 2)) / (height / 2), half = width / 2 * sqrt(max(0, 1 - normalized * normalized))
        x1 = left + width / 2 - half; x2 = left + width / 2 + half
      } else if kind == "triangle" {
        x1 = left + width / 2 * (1 - progress); x2 = left + width / 2 * (1 + progress)
      }
      if x2 - x1 > spacing {
        let points = [CGPoint(x:x1,y:y),CGPoint(x:x2,y:y)].enumerated().map { index, location in PKStrokePoint(location: location, timeOffset: TimeInterval(index) * 0.01, size: fillSize, opacity: 1, force: prototype.force, azimuth: prototype.azimuth, altitude: prototype.altitude) }
        fills.append(PKStroke(ink: fillInk, path: PKStrokePath(controlPoints: points, creationDate: source.path.creationDate)))
      }
      y += spacing
    }
    return fills + outlines
  }

  private func simplifyShapePath(_ points: [CGPoint], epsilon: CGFloat) -> [CGPoint] {
    guard points.count > 2, let first = points.first, let last = points.last else { return points }
    var farthest = CGFloat(0), farthestIndex = 0
    for index in 1..<(points.count - 1) {
      let distance = pointSegmentDistance(points[index], start: first, end: last)
      if distance > farthest { farthest = distance; farthestIndex = index }
    }
    guard farthest > epsilon else { return [first, last] }
    let left = simplifyShapePath(Array(points[0...farthestIndex]), epsilon: epsilon), right = simplifyShapePath(Array(points[farthestIndex...]), epsilon: epsilon)
    return Array(left.dropLast()) + right
  }

  private func pointSegmentDistance(_ point: CGPoint, start: CGPoint, end: CGPoint) -> CGFloat {
    let dx = end.x - start.x, dy = end.y - start.y, denominator = dx * dx + dy * dy
    guard denominator > 0 else { return hypot(point.x - start.x, point.y - start.y) }
    let t = max(CGFloat(0), min(CGFloat(1), ((point.x - start.x) * dx + (point.y - start.y) * dy) / denominator))
    return hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
  }

  private func nearestAnchor(to point: CGPoint, in anchors: [CGPoint], threshold: CGFloat) -> CGPoint? {
    anchors.reduce(nil as (point: CGPoint, distance: CGFloat)?) { nearest, candidate in
      let distance = hypot(candidate.x - point.x, candidate.y - point.y)
      guard distance <= threshold, nearest == nil || distance < nearest!.distance else { return nearest }
      return (candidate, distance)
    }?.point
  }

  private func dashedPaths(_ points: [CGPoint]) -> [[CGPoint]] {
    guard points.count > 1 else { return [] }
    var samples: [(CGPoint, CGFloat)] = [(points[0], 0)], distance = CGFloat(0)
    for index in 1..<points.count {
      let start = points[index - 1], end = points[index], length = hypot(end.x - start.x, end.y - start.y)
      let steps = max(1, Int(ceil(length / 2)))
      for step in 1...steps {
        let t = CGFloat(step) / CGFloat(steps)
        distance += length / CGFloat(steps)
        samples.append((CGPoint(x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t), distance))
      }
    }
    var result: [[CGPoint]] = [], active: [CGPoint] = []
    for (point, traveled) in samples {
      let drawing = traveled.truncatingRemainder(dividingBy: 19) < 12
      if drawing { active.append(point) }
      else if active.count > 1 { result.append(active); active = [] }
      else { active = [] }
    }
    if active.count > 1 { result.append(active) }
    return result
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

  private func circleLassoTargets(_ gesture: PKStroke, in previous: [PKStroke]) -> [Int]? {
    guard gesture.path.count >= 14 else { return nil }
    let bounds = gesture.renderBounds, diagonal = hypot(bounds.width, bounds.height)
    guard bounds.width >= 28, bounds.height >= 28, diagonal > 0 else { return nil }
    let start = gesture.path[0].location, end = gesture.path[gesture.path.count - 1].location
    guard hypot(end.x - start.x, end.y - start.y) <= max(14, diagonal * 0.18) else { return nil }
    let aspect = bounds.width / max(bounds.height, 1)
    guard aspect >= 0.45, aspect <= 2.2 else { return nil }
    var length = CGFloat(0), last = start
    for index in 1..<gesture.path.count { let point = gesture.path[index].location; length += hypot(point.x - last.x, point.y - last.y); last = point }
    let expected = .pi * (bounds.width + bounds.height) / 2
    guard length >= expected * 0.65, length <= expected * 1.7 else { return nil }
    let interior = bounds.insetBy(dx: max(5, bounds.width * 0.06), dy: max(5, bounds.height * 0.06))
    return previous.enumerated().compactMap { index, stroke in interior.contains(CGPoint(x: stroke.renderBounds.midX, y: stroke.renderBounds.midY)) ? index : nil }
  }

  private func heldAtEnd(_ stroke: PKStroke) -> Bool {
    guard stroke.path.count >= 3 else { return false }
    let last = stroke.path[stroke.path.count - 1], radius = CGFloat(7)
    for index in stride(from: stroke.path.count - 2, through: 0, by: -1) {
      let point = stroke.path[index]
      if hypot(point.location.x - last.location.x, point.location.y - last.location.y) > radius {
        return last.timeOffset - point.timeOffset >= 0.35
      }
    }
    return false
  }

  private func registerTransformUndo(_ drawing: PKDrawing) {
    canvas.undoManager?.registerUndo(withTarget: self) { target in
      let inverse = target.canvas.drawing
      target.registerTransformUndo(inverse)
      target.applyingShape = true
      target.canvas.drawing = drawing
      target.applyingShape = false
      target.sourceDrawing = drawing
      target.knownStrokeCount = drawing.strokes.count
      let value = drawing.dataRepresentation().base64EncodedString()
      target.loadedDrawing = value
      target.onDrawingChange(["drawingData": value])
      target.onHistoryChange([
        "canUndo": target.canvas.undoManager?.canUndo ?? false,
        "canRedo": target.canvas.undoManager?.canRedo ?? false
      ])
    }
  }
}

extension UIColor {
  convenience init(hanjiHex: String) {
    var raw = hanjiHex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    if raw.count == 3 { raw = raw.map { "\($0)\($0)" }.joined() }
    var value: UInt64 = 0
    Scanner(string: raw).scanHexInt64(&value)
    let hasAlpha = raw.count == 8
    self.init(
      red: CGFloat((value >> (hasAlpha ? 24 : 16)) & 255) / 255,
      green: CGFloat((value >> (hasAlpha ? 16 : 8)) & 255) / 255,
      blue: CGFloat((value >> (hasAlpha ? 8 : 0)) & 255) / 255,
      alpha: hasAlpha ? CGFloat(value & 255) / 255 : 1
    )
  }

  var hanjiHexWithAlpha: String {
    var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
    guard getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { return "#000000FF" }
    return String(format: "#%02X%02X%02X%02X", Int(round(red * 255)), Int(round(green * 255)), Int(round(blue * 255)), Int(round(alpha * 255)))
  }
}
