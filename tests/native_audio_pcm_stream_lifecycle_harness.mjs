import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(
  root,
  'node_modules',
  '@fugood',
  'react-native-audio-pcm-stream',
  'android',
  'src',
  'main',
  'java',
  'com',
  'imxiqi',
  'rnliveaudiostream',
  'RNLiveAudioStreamModule.java',
);
const executable = (name) => process.platform === 'win32' ? `${name}.exe` : name;
const javac = process.env.JAVAC ?? (process.env.JAVA_HOME
  ? path.join(process.env.JAVA_HOME, 'bin', executable('javac'))
  : executable('javac'));
const java = process.env.JAVA ?? (process.env.JAVA_HOME
  ? path.join(process.env.JAVA_HOME, 'bin', executable('java'))
  : executable('java'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-audio-record-'));

function write(relative, contents) {
  const target = path.join(temp, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  return target;
}

try {
  write('android/media/AudioFormat.java', `package android.media;
public final class AudioFormat { public static final int CHANNEL_IN_MONO=16, CHANNEL_IN_STEREO=12, ENCODING_PCM_16BIT=2, ENCODING_PCM_8BIT=3; }
`);
  write('android/media/MediaRecorder.java', `package android.media;
public final class MediaRecorder { public static final class AudioSource { public static final int VOICE_RECOGNITION=6; } }
`);
  write('android/util/Base64.java', `package android.util;
public final class Base64 { public static final int NO_WRAP=2; public static String encodeToString(byte[] data, int flags) { return java.util.Base64.getEncoder().encodeToString(data); } }
`);
  write('android/util/Log.java', 'package android.util; public final class Log {}\n');
  write('android/media/AudioRecord.java', `package android.media;
import java.util.*; import java.util.concurrent.*;
public class AudioRecord {
  public static final int STATE_INITIALIZED=1, STATE_UNINITIALIZED=0;
  public static final List<AudioRecord> instances = new CopyOnWriteArrayList<>();
  public static volatile boolean failNextInit, throwNextStart, throwNextConstruct, returnFull;
  public static final CountDownLatch firstReadEntered = new CountDownLatch(1);
  public static final CountDownLatch allowFirstRead = new CountDownLatch(1);
  public final int id; public volatile boolean released, stopped;
  public int releaseCount;
  public AudioRecord(int source, int rate, int channels, int format, int buffer) { if (throwNextConstruct) { throwNextConstruct=false; throw new IllegalArgumentException("construct"); } id=instances.size()+1; instances.add(this); }
  public static int getMinBufferSize(int a,int b,int c) { return 4; }
  public int getState() { return failNextInit ? STATE_UNINITIALIZED : STATE_INITIALIZED; }
  public void startRecording() { if (throwNextStart) { throwNextStart=false; throw new IllegalStateException("start"); } }
  public int read(byte[] out,int off,int len) {
    if (id == 1) { firstReadEntered.countDown(); try { allowFirstRead.await(2, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }
    if (released) throw new IllegalStateException("read after release");
    out[off]=5; out[off+1]=6; return returnFull ? len : 2;
  }
  public void stop() { stopped=true; }
  public void release() { releaseCount++; released=true; }
}
`);
  write('com/facebook/react/bridge/ReactMethod.java', 'package com.facebook.react.bridge; import java.lang.annotation.*; @Retention(RetentionPolicy.RUNTIME) public @interface ReactMethod {}\n');
  write('com/facebook/react/bridge/Promise.java', 'package com.facebook.react.bridge; public interface Promise { void resolve(Object value); void reject(String code); }\n');
  write('com/facebook/react/bridge/ReadableMap.java', 'package com.facebook.react.bridge; public interface ReadableMap { boolean hasKey(String key); int getInt(String key); }\n');
  write('com/facebook/react/bridge/ReactApplicationContext.java', `package com.facebook.react.bridge;
public class ReactApplicationContext { public <T> T getJSModule(Class<T> cls) { try { return cls.getDeclaredConstructor().newInstance(); } catch(Exception e) { throw new RuntimeException(e); } } }
`);
  write('com/facebook/react/bridge/ReactContextBaseJavaModule.java', 'package com.facebook.react.bridge; public abstract class ReactContextBaseJavaModule { public ReactContextBaseJavaModule(ReactApplicationContext c) {} public abstract String getName(); }\n');
  write('com/facebook/react/modules/core/DeviceEventManagerModule.java', `package com.facebook.react.modules.core;
public final class DeviceEventManagerModule { public static class RCTDeviceEventEmitter { public static volatile String last; public static final java.util.List<String> events = new java.util.concurrent.CopyOnWriteArrayList<>(); public void emit(String name, Object data) { last = String.valueOf(data); events.add(last); } } }
`);
  const test = write('AudioLifecycleHarness.java', `import com.imxiqi.rnliveaudiostream.RNLiveAudioStreamModule;
import com.facebook.react.bridge.*; import com.facebook.react.modules.core.DeviceEventManagerModule; import android.media.AudioRecord; import java.util.*; import java.util.concurrent.*;
public final class AudioLifecycleHarness {
  static final class Map implements ReadableMap { public boolean hasKey(String k) { return false; } public int getInt(String k) { return 0; } }
  static final class Result implements Promise { boolean resolved, rejected; public void resolve(Object v) { resolved=true; } public void reject(String c) { rejected=true; } }
  static void require(boolean ok, String message) { if (!ok) throw new AssertionError(message); }
  static void waitFor(java.util.function.BooleanSupplier check, String message) throws Exception { long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(2); while(!check.getAsBoolean() && System.nanoTime()<until) Thread.sleep(5); require(check.getAsBoolean(), message); }
  public static void main(String[] args) {
    try { run(); } catch (Throwable failure) { failure.printStackTrace(); System.exit(1); }
    System.exit(0);
  }
  static void run() throws Exception {
    RNLiveAudioStreamModule module = new RNLiveAudioStreamModule(new ReactApplicationContext());
    Result initial = new Result(); module.init(new Map(), initial); require(initial.resolved, "initial init"); module.start();
    require(AudioRecord.firstReadEntered.await(2, TimeUnit.SECONDS), "old worker entered read");
    module.stop(); require(AudioRecord.instances.get(0).stopped, "stop immediately unblocks the active read"); Result replacement = new Result(); module.init(new Map(), replacement); require(replacement.resolved, "replacement init"); module.start();
    AudioRecord.allowFirstRead.countDown();
    waitFor(() -> AudioRecord.instances.get(0).released, "old worker releases its own recorder");
    require(!AudioRecord.instances.get(1).released, "old worker must not release replacement recorder");
    waitFor(() -> DeviceEventManagerModule.RCTDeviceEventEmitter.events.contains("BQY="), "partial PCM chunk must retain exact bytes"); AudioRecord.returnFull=true; waitFor(() -> DeviceEventManagerModule.RCTDeviceEventEmitter.events.contains("BQYAAA=="), "full PCM chunk must retain all bytes");
    module.stop(); waitFor(() -> AudioRecord.instances.get(1).released, "replacement releases after its own stop");
    require(AudioRecord.instances.get(0).releaseCount == 1, "old recorder released once"); require(AudioRecord.instances.get(1).releaseCount == 1, "replacement released once");
    Result idleA = new Result(); module.init(new Map(), idleA); Result idleB = new Result(); module.init(new Map(), idleB); require(AudioRecord.instances.get(2).released, "second init releases an idle recorder"); module.stop(); module.stop();
    AudioRecord.failNextInit=true; Result failed = new Result(); module.init(new Map(), failed); require(failed.rejected, "failed init rejects"); require(AudioRecord.instances.get(4).released, "failed init releases its recorder"); AudioRecord.failNextInit=false;
    Result startFailureInit = new Result(); module.init(new Map(), startFailureInit); AudioRecord.throwNextStart=true; module.start(); require(AudioRecord.instances.get(5).released, "failed start releases its recorder without crossing the native bridge");
    Result constructorIdle = new Result(); module.init(new Map(), constructorIdle); AudioRecord.throwNextConstruct=true; Result constructorFailure = new Result(); module.init(new Map(), constructorFailure); require(constructorFailure.rejected, "constructor failure rejects"); require(AudioRecord.instances.get(6).released, "constructor failure still releases the previous idle recorder");
  }
}
`);
  execFileSync(javac, ['-d', temp, source, ...walkJava(temp)], { stdio: 'pipe', timeout: 30000 });
  execFileSync(java, ['-cp', temp, 'AudioLifecycleHarness'], { stdio: 'pipe', timeout: 30000 });
  console.log('audio recorder lifecycle harness passed');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

function walkJava(directory) {
  return fs.readdirSync(directory, { recursive: true })
    .filter((file) => typeof file === 'string' && file.endsWith('.java'))
    .map((file) => path.join(directory, file));
}
