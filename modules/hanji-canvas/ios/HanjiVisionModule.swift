import ExpoModulesCore
import PDFKit
import PencilKit
import UIKit
import Vision

public final class HanjiVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HanjiVision")
    AsyncFunction("recognizeDrawing") { (base64: String) throws -> [String: Any] in
      guard let data = Data(base64Encoded: base64), let drawing = try? PKDrawing(data: data), !drawing.strokes.isEmpty else { return ["text": "", "words": []] }
      let bounds = drawing.bounds.insetBy(dx: -24, dy: -24)
      guard let cgImage = drawing.image(from: bounds, scale: 3).cgImage else { return ["text": "", "words": []] }
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true
      request.recognitionLanguages = ["ko-KR", "en-US"]
      try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
      let observations = request.results ?? []
      let words: [[String: Any]] = observations.compactMap { item in
        guard let candidate = item.topCandidates(1).first else { return nil }
        return ["text": candidate.string, "confidence": candidate.confidence, "x": item.boundingBox.origin.x, "y": item.boundingBox.origin.y, "width": item.boundingBox.width, "height": item.boundingBox.height]
      }
      return ["text": words.compactMap { $0["text"] as? String }.joined(separator: " "), "words": words]
    }
    AsyncFunction("exportPDF") { (pages: [[String: String]], outputUri: String) throws -> String in
      let outputURL = outputUri.hasPrefix("file://") ? URL(string: outputUri)! : URL(fileURLWithPath: outputUri)
      let defaultBounds = CGRect(x: 0, y: 0, width: 595, height: 842)
      let renderer = UIGraphicsPDFRenderer(bounds: defaultBounds)
      try renderer.writePDF(to: outputURL) { context in
        for (index, item) in pages.enumerated() {
          let pdfURI = item["pdfUri"] ?? ""
          let sourceURL = pdfURI.isEmpty ? nil : (pdfURI.hasPrefix("file://") ? URL(string: pdfURI) : URL(fileURLWithPath: pdfURI))
          let sourceDocument = sourceURL.flatMap { PDFDocument(url: $0) }
          let sourcePage = sourceDocument?.page(at: Int(item["pdfPageIndex"] ?? "") ?? index)
          let bounds = sourcePage?.bounds(for: .mediaBox) ?? defaultBounds
          context.beginPage(withBounds: bounds, pageInfo: [:])
          UIColor.white.setFill(); context.cgContext.fill(bounds)
          if let sourcePage {
            context.cgContext.saveGState()
            context.cgContext.translateBy(x: 0, y: bounds.height)
            context.cgContext.scaleBy(x: 1, y: -1)
            sourcePage.draw(with: .mediaBox, to: context.cgContext)
            context.cgContext.restoreGState()
          } else { drawHanjiTemplate(item["template"] ?? "plain", in: bounds, context: context.cgContext) }
          if let encoded = item["drawingData"], let data = Data(base64Encoded: encoded), let drawing = try? PKDrawing(data: data), !drawing.strokes.isEmpty {
            drawing.image(from: bounds, scale: 3).draw(in: bounds)
          }
        }
      }
      return outputURL.absoluteString
    }
    AsyncFunction("exportPNG") { (item: [String: String], outputUri: String) throws -> String in
      let outputURL = outputUri.hasPrefix("file://") ? URL(string: outputUri)! : URL(fileURLWithPath: outputUri)
      let defaultBounds = CGRect(x: 0, y: 0, width: 900, height: 636)
      let pdfURI = item["pdfUri"] ?? ""
      let sourceURL = pdfURI.isEmpty ? nil : (pdfURI.hasPrefix("file://") ? URL(string: pdfURI) : URL(fileURLWithPath: pdfURI))
      let sourcePage = sourceURL.flatMap { PDFDocument(url: $0) }?.page(at: Int(item["pdfPageIndex"] ?? "") ?? 0)
      let bounds = sourcePage?.bounds(for: .mediaBox) ?? defaultBounds
      let format = UIGraphicsImageRendererFormat(); format.scale = 3; format.opaque = true
      let image = UIGraphicsImageRenderer(size: bounds.size, format: format).image { context in
        UIColor.white.setFill(); context.cgContext.fill(bounds)
        if let sourcePage {
          context.cgContext.saveGState()
          context.cgContext.translateBy(x: 0, y: bounds.height)
          context.cgContext.scaleBy(x: 1, y: -1)
          sourcePage.draw(with: .mediaBox, to: context.cgContext)
          context.cgContext.restoreGState()
        } else { drawHanjiTemplate(item["template"] ?? "plain", in: bounds, context: context.cgContext) }
        if let encoded = item["drawingData"], let data = Data(base64Encoded: encoded), let drawing = try? PKDrawing(data: data), !drawing.strokes.isEmpty {
          drawing.image(from: bounds, scale: 3).draw(in: bounds)
        }
      }
      guard let data = image.pngData() else { throw NSError(domain: "HanjiExport", code: 1, userInfo: [NSLocalizedDescriptionKey: "PNG encoding failed"]) }
      try data.write(to: outputURL, options: .atomic)
      return outputURL.absoluteString
    }
  }
}

private func drawHanjiTemplate(_ template: String, in bounds: CGRect, context: CGContext) {
  context.saveGState(); defer { context.restoreGState() }
  context.setStrokeColor(UIColor(red: 0.86, green: 0.88, blue: 0.85, alpha: 1).cgColor)
  context.setFillColor(UIColor(red: 0.76, green: 0.79, blue: 0.75, alpha: 1).cgColor)
  context.setLineWidth(0.6)
  let step: CGFloat = template == "dot" ? 22 : 28
  if template == "line" || template == "grid" { for y in stride(from: step, to: bounds.height, by: step) { context.move(to: CGPoint(x: 0, y: y)); context.addLine(to: CGPoint(x: bounds.width, y: y)) } }
  if template == "grid" { for x in stride(from: step, to: bounds.width, by: step) { context.move(to: CGPoint(x: x, y: 0)); context.addLine(to: CGPoint(x: x, y: bounds.height)) } }
  if template == "dot" { for y in stride(from: step, to: bounds.height, by: step) { for x in stride(from: step, to: bounds.width, by: step) { context.fillEllipse(in: CGRect(x: x - 0.8, y: y - 0.8, width: 1.6, height: 1.6)) } } }
  context.strokePath()
}
