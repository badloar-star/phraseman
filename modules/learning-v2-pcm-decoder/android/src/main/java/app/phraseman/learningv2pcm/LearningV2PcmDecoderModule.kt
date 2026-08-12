package app.phraseman.learningv2pcm

import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.os.SystemClock
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.sqrt

private val acceptedSampleRates = setOf(8_000, 11_025, 12_000, 16_000, 22_050, 24_000, 32_000, 44_100, 48_000)
private const val maximumFrames = 48_000 * 120
private const val dequeueTimeoutUs = 10_000L
private const val maximumDecodeWallMs = 180_000L

private fun fail(reason: String): Nothing = throw IllegalArgumentException("learning_v2_pcm_decoder_invalid:$reason")
private fun sha256(bytes: ByteArray): String {
  val digest = MessageDigest.getInstance("SHA-256")
  digest.update(bytes)
  return digest.digest().joinToString("") { "%02x".format(it) }
}

private fun boundedBytes(file: File, maximumByteSize: Int): ByteArray {
  val output = ByteArrayOutputStream(minOf(maximumByteSize, 8_192))
  file.inputStream().use { input ->
    val buffer = ByteArray(8_192)
    while (true) {
      val count = input.read(buffer)
      if (count < 0) break
      if (output.size() + count > maximumByteSize) fail("source_oversize")
      output.write(buffer, 0, count)
    }
  }
  return output.toByteArray()
}

class LearningV2PcmDecoderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LearningV2PcmDecoder")

    AsyncFunction("decodeFile") Coroutine { fileUri: String, expectedSha256: String, expectedByteSize: Int, maximumByteSize: Int ->
      if (!expectedSha256.matches(Regex("^[a-f0-9]{64}$")) || expectedByteSize <= 0 || maximumByteSize <= 0 || expectedByteSize > maximumByteSize || maximumByteSize > 64 * 1_024) fail("request")
      val uri = Uri.parse(fileUri)
      if (uri.scheme != "file") fail("uri")
      val requestedFile = File(uri.path ?: fail("path"))
      val file = requestedFile.canonicalFile
      if (file.absolutePath != requestedFile.absolutePath) fail("path")
      if (!file.isFile || file.length() != expectedByteSize.toLong() || file.length() > maximumByteSize) fail("source")
      val sourceBytes = boundedBytes(file, maximumByteSize)
      if (sourceBytes.size != expectedByteSize || sha256(sourceBytes) != expectedSha256) fail("source")
      val cacheDirectory = appContext.reactContext?.cacheDir ?: fail("context")
      val decodeFile = File.createTempFile("learning-v2-pcm-", ".mp3", cacheDirectory)
      try { decodeFile.writeBytes(sourceBytes) } catch (error: Throwable) {
        decodeFile.delete()
        throw error
      }

      val extractor = MediaExtractor()
      var codec: MediaCodec? = null
      try {
        extractor.setDataSource(decodeFile.absolutePath)
        var track = -1
        var sourceFormat: MediaFormat? = null
        for (index in 0 until extractor.trackCount) {
          val candidate = extractor.getTrackFormat(index)
          val mime = candidate.getString(MediaFormat.KEY_MIME).orEmpty()
          if (mime.startsWith("audio/")) { track = index; sourceFormat = candidate; break }
        }
        if (track < 0 || sourceFormat == null) fail("audio_track")
        extractor.selectTrack(track)
        val mime = sourceFormat.getString(MediaFormat.KEY_MIME) ?: fail("mime")
        codec = MediaCodec.createDecoderByType(mime)
        codec.configure(sourceFormat, null, null, 0)
        codec.start()

        var inputEnded = false
        var outputEnded = false
        var sampleRate = 0
        var channelCount = 0
        var sampleCount = 0
        var frameCount = 0
        var sumSquares = 0L
        var peak = 0
        var activeSamples = 0
        var clippedSamples = 0
        var zeroSamples = 0
        var leadingSilentFrames = 0
        var trailingSilentFrames = 0
        var activeFrameObserved = false
        var channelOffset = 0
        var currentFrameActive = false
        val info = MediaCodec.BufferInfo()
        val decodeStartedAtMs = SystemClock.elapsedRealtime()

        while (!outputEnded) {
          if (SystemClock.elapsedRealtime() - decodeStartedAtMs > maximumDecodeWallMs) fail("decode_timeout")
          if (!inputEnded) {
            val inputIndex = codec.dequeueInputBuffer(dequeueTimeoutUs)
            if (inputIndex >= 0) {
              val inputBuffer = codec.getInputBuffer(inputIndex) ?: fail("input_buffer")
              val size = extractor.readSampleData(inputBuffer, 0)
              if (size < 0) {
                codec.queueInputBuffer(inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                inputEnded = true
              } else {
                codec.queueInputBuffer(inputIndex, 0, size, extractor.sampleTime, 0)
                extractor.advance()
              }
            }
          }
          when (val outputIndex = codec.dequeueOutputBuffer(info, dequeueTimeoutUs)) {
            MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
              val format = codec.outputFormat
              sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
              channelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
              if (sampleRate !in acceptedSampleRates || channelCount !in 1..2) fail("format")
              if (format.containsKey(MediaFormat.KEY_PCM_ENCODING) && format.getInteger(MediaFormat.KEY_PCM_ENCODING) != AudioFormat.ENCODING_PCM_16BIT) fail("pcm_encoding")
            }
            MediaCodec.INFO_TRY_AGAIN_LATER, MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED -> Unit
            else -> if (outputIndex >= 0) {
              if (sampleRate == 0 || channelCount == 0) fail("format_missing")
              val output = codec.getOutputBuffer(outputIndex) ?: fail("output_buffer")
              output.position(info.offset)
              output.limit(info.offset + info.size)
              if (info.size % 2 != 0) fail("unaligned_pcm")
              output.order(java.nio.ByteOrder.LITTLE_ENDIAN)
              while (output.remaining() >= 2) {
                val sample = output.short.toInt()
                val absolute = if (sample == Short.MIN_VALUE.toInt()) 32_768 else abs(sample)
                val square = absolute.toLong() * absolute.toLong()
                if (Long.MAX_VALUE - sumSquares < square) fail("metric_overflow")
                sumSquares += square
                peak = maxOf(peak, absolute)
                if (absolute >= 328) { activeSamples += 1; currentFrameActive = true }
                if (absolute >= 32_760) clippedSamples += 1
                if (absolute == 0) zeroSamples += 1
                sampleCount += 1
                channelOffset += 1
                if (channelOffset == channelCount) {
                  if (currentFrameActive) { activeFrameObserved = true; trailingSilentFrames = 0 }
                  else if (!activeFrameObserved) leadingSilentFrames += 1
                  else trailingSilentFrames += 1
                  channelOffset = 0
                  currentFrameActive = false
                  frameCount += 1
                  if (frameCount > maximumFrames) fail("decoded_audio_too_large")
                }
              }
              codec.releaseOutputBuffer(outputIndex, false)
              if ((info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) outputEnded = true
            }
          }
        }
        if (frameCount < sampleRate / 10 || channelOffset != 0 || sampleCount != frameCount * channelCount) fail("decoded_audio_too_short")
        fun basisPoints(count: Int) = count * 10_000 / sampleCount
        mapOf(
          "schemaVersion" to "learning-v2-native-pcm-decode-metrics.v1",
          "decoderBackend" to "android_media_codec",
          "sourceByteSize" to expectedByteSize,
          "sourceSha256" to expectedSha256,
          "sampleRateHz" to sampleRate,
          "channelCount" to channelCount,
          "sampleCount" to sampleCount,
          "frameCount" to frameCount,
          "durationMs" to (frameCount.toDouble() * 1_000 / sampleRate).roundToInt(),
          "peakAbsoluteSample" to peak,
          "rmsAbsoluteSample" to sqrt((sumSquares / sampleCount).toDouble()).toInt(),
          "activeSampleBasisPoints" to basisPoints(activeSamples),
          "clippedSampleBasisPoints" to basisPoints(clippedSamples),
          "zeroSampleBasisPoints" to basisPoints(zeroSamples),
          "leadingSilenceMs" to (leadingSilentFrames.toDouble() * 1_000 / sampleRate).roundToInt(),
          "trailingSilenceMs" to (trailingSilentFrames.toDouble() * 1_000 / sampleRate).roundToInt(),
        )
      } finally {
        try { codec?.stop() } catch (_: Throwable) { }
        codec?.release()
        extractor.release()
        decodeFile.delete()
      }
    }
  }
}
