import AVFoundation
import CryptoKit
import ExpoModulesCore
import Foundation

private let acceptedSampleRates: Set<Int> = [
  8_000, 11_025, 12_000, 16_000, 22_050, 24_000, 32_000, 44_100, 48_000
]
private let maximumFrames = 48_000 * 120
private let readBufferFrames: AVAudioFrameCount = 4_096

private func decoderError(_ reason: String) -> Exception {
  Exception(name: "LearningV2PcmDecoderInvalid", description: reason)
}

private func hexSha256(_ data: Data) -> String {
  SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
}

private func quantizePcm16(_ sample: Float) -> Int {
  if sample >= 1 { return 32_767 }
  if sample <= -1 { return -32_768 }
  return Int((sample * 32_767).rounded())
}

public final class LearningV2PcmDecoderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LearningV2PcmDecoder")

    AsyncFunction("decodeFile") { (
      fileUri: String,
      expectedSha256: String,
      expectedByteSize: Int,
      maximumByteSize: Int
    ) throws -> [String: Any] in
      guard
        expectedSha256.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
        expectedByteSize > 0,
        maximumByteSize > 0,
        expectedByteSize <= maximumByteSize,
        maximumByteSize <= 64 * 1_024,
        let url = URL(string: fileUri),
        url.isFileURL
      else { throw decoderError("request_invalid") }

      let normalizedUrl = url.standardizedFileURL
      guard normalizedUrl == url else { throw decoderError("source_path_invalid") }
      let values = try normalizedUrl.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
      guard
        values.isRegularFile == true,
        let fileSize = values.fileSize,
        fileSize == expectedByteSize,
        fileSize <= maximumByteSize
      else { throw decoderError("source_size_invalid") }
      let sourceHandle = try FileHandle(forReadingFrom: normalizedUrl)
      defer { try? sourceHandle.close() }
      let source = try sourceHandle.read(upToCount: maximumByteSize + 1) ?? Data()
      guard source.count == expectedByteSize, hexSha256(source) == expectedSha256 else {
        throw decoderError("source_hash_invalid")
      }

      let decodeUrl = FileManager.default.temporaryDirectory
        .appendingPathComponent("learning-v2-pcm-\(UUID().uuidString)")
        .appendingPathExtension("mp3")
      try source.write(to: decodeUrl, options: [.atomic])
      defer { try? FileManager.default.removeItem(at: decodeUrl) }

      let audioFile = try AVAudioFile(
        forReading: decodeUrl,
        commonFormat: .pcmFormatFloat32,
        interleaved: false
      )
      let format = audioFile.processingFormat
      let sampleRate = Int(format.sampleRate.rounded())
      let channelCount = Int(format.channelCount)
      guard acceptedSampleRates.contains(sampleRate), channelCount == 1 || channelCount == 2 else {
        throw decoderError("format_invalid")
      }
      guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: readBufferFrames) else {
        throw decoderError("buffer_invalid")
      }

      var sampleCount = 0
      var frameCount = 0
      var sumSquares: UInt64 = 0
      var peak = 0
      var activeSamples = 0
      var clippedSamples = 0
      var zeroSamples = 0
      var leadingSilentFrames = 0
      var trailingSilentFrames = 0
      var activeFrameObserved = false

      while true {
        try audioFile.read(into: buffer, frameCount: readBufferFrames)
        let frames = Int(buffer.frameLength)
        if frames == 0 { break }
        guard frameCount + frames <= maximumFrames, let channels = buffer.floatChannelData else {
          throw decoderError("decoded_audio_too_large")
        }
        for frame in 0..<frames {
          var frameActive = false
          for channel in 0..<channelCount {
            let sample = quantizePcm16(channels[channel][frame])
            let absolute = sample == -32_768 ? 32_768 : abs(sample)
            let square = UInt64(absolute) * UInt64(absolute)
            guard sumSquares <= UInt64.max - square else { throw decoderError("metric_overflow") }
            sumSquares += square
            peak = max(peak, absolute)
            if absolute >= 328 { activeSamples += 1; frameActive = true }
            if absolute >= 32_760 { clippedSamples += 1 }
            if absolute == 0 { zeroSamples += 1 }
            sampleCount += 1
          }
          if frameActive {
            activeFrameObserved = true
            trailingSilentFrames = 0
          } else if !activeFrameObserved {
            leadingSilentFrames += 1
          } else {
            trailingSilentFrames += 1
          }
        }
        frameCount += frames
      }
      guard frameCount >= sampleRate / 10, sampleCount == frameCount * channelCount else {
        throw decoderError("decoded_audio_too_short")
      }
      let rms = Int(sqrt(Double(sumSquares / UInt64(sampleCount))).rounded(.down))
      func basisPoints(_ count: Int) -> Int { count * 10_000 / sampleCount }
      return [
        "schemaVersion": "learning-v2-native-pcm-decode-metrics.v1",
        "decoderBackend": "av_audio_file",
        "sourceByteSize": source.count,
        "sourceSha256": expectedSha256,
        "sampleRateHz": sampleRate,
        "channelCount": channelCount,
        "sampleCount": sampleCount,
        "frameCount": frameCount,
        "durationMs": Int((Double(frameCount) * 1_000 / Double(sampleRate)).rounded()),
        "peakAbsoluteSample": peak,
        "rmsAbsoluteSample": rms,
        "activeSampleBasisPoints": basisPoints(activeSamples),
        "clippedSampleBasisPoints": basisPoints(clippedSamples),
        "zeroSampleBasisPoints": basisPoints(zeroSamples),
        "leadingSilenceMs": Int((Double(leadingSilentFrames) * 1_000 / Double(sampleRate)).rounded()),
        "trailingSilenceMs": Int((Double(trailingSilentFrames) * 1_000 / Double(sampleRate)).rounded())
      ]
    }
  }
}
