import ExpoModulesCore
import PencilKit
import Vision

public final class HanjiVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HanjiVision")
    AsyncFunction("recognizeDrawing") { (base64: String) throws -> [String: Any] in
      guard let data = Data(base64Encoded: base64), let drawing = try? PKDrawing(data: data), !drawing.strokes.isEmpty else {
        return ["text": "", "words": []]
      }
      let bounds = drawing.bounds.insetBy(dx: -24, dy: -24)
      guard let cgImage = drawing.image(from: bounds, scale: 3).cgImage else {
        return ["text": "", "words": []]
      }
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true
      request.recognitionLanguages = ["ko-KR", "en-US"]
      try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
      let observations = request.results ?? []
      let words: [[String: Any]] = observations.compactMap { item in
        guard let candidate = item.topCandidates(1).first else { return nil }
        return [
          "text": candidate.string,
          "confidence": candidate.confidence,
          "x": item.boundingBox.origin.x,
          "y": item.boundingBox.origin.y,
          "width": item.boundingBox.width,
          "height": item.boundingBox.height
        ]
      }
      return ["text": words.compactMap { $0["text"] as? String }.joined(separator: " "), "words": words]
    }
  }
}
