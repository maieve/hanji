import ExpoModulesCore
import Speech

public final class HanjiSpeechModule: Module {
  private var tasks: [String: SFSpeechRecognitionTask] = [:]

  public func definition() -> ModuleDefinition {
    Name("HanjiSpeech")
    AsyncFunction("transcribeAudio") { (uri: String, promise: Promise) in
      SFSpeechRecognizer.requestAuthorization { [weak self] status in
        guard status == .authorized else {
          promise.reject("E_SPEECH_PERMISSION", "설정에서 음성 인식 권한을 허용해 주세요.")
          return
        }
        guard let self, let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "ko-KR")), recognizer.isAvailable else {
          promise.reject("E_SPEECH_UNAVAILABLE", "이 기기에서 한국어 음성 인식을 사용할 수 없습니다.")
          return
        }
        guard recognizer.supportsOnDeviceRecognition else {
          promise.reject("E_ON_DEVICE_UNAVAILABLE", "이 기기는 온디바이스 한국어 전사를 지원하지 않습니다.")
          return
        }
        let url = uri.hasPrefix("file://") ? URL(string: uri) : URL(fileURLWithPath: uri)
        guard let url else { promise.reject("E_AUDIO_URI", "녹음 파일 경로가 올바르지 않습니다."); return }
        let request = SFSpeechURLRecognitionRequest(url: url)
        request.requiresOnDeviceRecognition = true
        request.shouldReportPartialResults = false
        request.addsPunctuation = true
        let id = UUID().uuidString
        let task = recognizer.recognitionTask(with: request) { [weak self] result, error in
          if let error {
            self?.tasks[id] = nil
            promise.reject("E_TRANSCRIPTION", error.localizedDescription)
            return
          }
          guard let result, result.isFinal else { return }
          self?.tasks[id] = nil
          let segments = result.bestTranscription.segments.map { segment in
            ["text": segment.substring, "start": segment.timestamp, "duration": segment.duration, "confidence": segment.confidence] as [String: Any]
          }
          promise.resolve(["text": result.bestTranscription.formattedString, "segments": segments])
        }
        self.tasks[id] = task
      }
    }
  }
}
