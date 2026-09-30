package app.phraseman

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Process
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper
import java.io.File

class AccountV2ProbeActivity : ReactActivity() {
  private data class LaunchBinding(
    val packageName: String,
    val processName: String,
    val pid: Int,
    val starttime: String,
    val launchNonce: String,
    val role: String,
    val identity: String
  )

  private data class Control(val command: String, val runtimeIdentity: String, val token: String?)

  private lateinit var launchBinding: LaunchBinding

  override fun onCreate(savedInstanceState: Bundle?) {
    launchBinding = validateLaunchIntent(intent)
    intent.data = launchUri(launchBinding)
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    val fabricEnabledForThisBuild = false
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(
        this,
        mainComponentName,
        fabricEnabledForThisBuild
      ) {}
    )
  }

  override fun onNewIntent(intent: Intent) {
    val control = validateControlIntent(intent, launchBinding)
    intent.data = controlUri(launchBinding, control)
    super.onNewIntent(intent)
    setIntent(intent)
  }

  private fun validateLaunchIntent(intent: Intent): LaunchBinding {
    if (intent.getStringExtra(EXTRA_COMMAND) != COMMAND_LAUNCH) invalidIntent()
    val role = intent.getStringExtra(EXTRA_ROLE)
    if (role != ROLE_HOLDER && role != ROLE_RELEASE) invalidIntent()
    val identity = intent.getStringExtra(EXTRA_IDENTITY)
    if (identity != IDENTITY_X && identity != IDENTITY_Y) invalidIntent()
    val launchNonce = intent.getStringExtra(EXTRA_LAUNCH_NONCE)
    if (!isHex32(launchNonce) || intent.hasExtra(EXTRA_RUNTIME_IDENTITY)) invalidIntent()

    val pid = Process.myPid()
    val processName = readProcessName(pid)
    if (processName != EXPECTED_PROCESS_NAME) invalidIntent()
    return LaunchBinding(
      packageName = packageName,
      processName = processName,
      pid = pid,
      starttime = readStarttime(pid),
      launchNonce = launchNonce!!,
      role = role!!,
      identity = identity!!
    )
  }

  private fun validateControlIntent(intent: Intent, launchBinding: LaunchBinding): Control {
    val command = intent.getStringExtra(EXTRA_COMMAND)
    val token = intent.getStringExtra(EXTRA_CHECKPOINT_TOKEN)
    val runtimeIdentity = intent.getStringExtra(EXTRA_RUNTIME_IDENTITY)
    if (
      (command != COMMAND_RELEASE && command != COMMAND_CHECKPOINT) ||
      (command == COMMAND_CHECKPOINT && !isHex32(token)) ||
      (command == COMMAND_RELEASE && token != null) ||
      !isHex32(runtimeIdentity) ||
      intent.getStringExtra(EXTRA_ROLE) != launchBinding.role ||
      intent.getStringExtra(EXTRA_IDENTITY) != launchBinding.identity ||
      intent.getStringExtra(EXTRA_PACKAGE_NAME) != launchBinding.packageName ||
      intent.getStringExtra(EXTRA_PROCESS_NAME) != launchBinding.processName ||
      intent.getIntExtra(EXTRA_PID, -1) != launchBinding.pid ||
      intent.getStringExtra(EXTRA_STARTTIME) != launchBinding.starttime ||
      intent.getStringExtra(EXTRA_LAUNCH_NONCE) != launchBinding.launchNonce ||
      Process.myPid() != launchBinding.pid ||
      readProcessName(Process.myPid()) != launchBinding.processName ||
      readStarttime(Process.myPid()) != launchBinding.starttime
    ) {
      invalidIntent()
    }
    return Control(command!!, runtimeIdentity!!, token)
  }

  private fun launchUri(binding: LaunchBinding): Uri = baseUri(COMMAND_LAUNCH, binding)
    .appendQueryParameter("role", binding.role)
    .appendQueryParameter("identity", binding.identity)
    .build()

  private fun controlUri(binding: LaunchBinding, control: Control): Uri {
    val uri = baseUri(control.command, binding)
      .appendQueryParameter("runtimeIdentity", control.runtimeIdentity)
    if (control.command == COMMAND_CHECKPOINT) uri.appendQueryParameter("token", control.token)
    return uri.build()
  }

  private fun baseUri(command: String, binding: LaunchBinding): Uri.Builder = Uri.Builder()
    .scheme("phraseman")
    .authority("_account_v2_provision_lock_probe")
    .appendQueryParameter("command", command)
    .appendQueryParameter("packageName", binding.packageName)
    .appendQueryParameter("processName", binding.processName)
    .appendQueryParameter("pid", binding.pid.toString())
    .appendQueryParameter("starttime", binding.starttime)
    .appendQueryParameter("launchNonce", binding.launchNonce)

  private fun readProcessName(pid: Int): String {
    val raw = try {
      File("/proc/$pid/cmdline").readBytes()
    } catch (_: Throwable) {
      invalidIntent()
    }
    val end = raw.indexOf(0).let { if (it < 0) raw.size else it }
    if (end <= 0) invalidIntent()
    return raw.copyOfRange(0, end).toString(Charsets.UTF_8)
  }

  private fun readStarttime(pid: Int): String {
    val stat = try {
      File("/proc/${Process.myPid()}/stat").readText(Charsets.UTF_8)
    } catch (_: Throwable) {
      invalidIntent()
    }
    if (pid != Process.myPid()) invalidIntent()
    val close = stat.lastIndexOf(')')
    if (close < 0 || close + 2 >= stat.length) invalidIntent()
    val fields = stat.substring(close + 2).trim().split(Regex("\\s+"))
    if (fields.size <= STARTTIME_AFTER_COMM_INDEX) invalidIntent()
    val starttime = fields[STARTTIME_AFTER_COMM_INDEX]
    if (starttime.isEmpty() || starttime.any { it !in '0'..'9' }) invalidIntent()
    return starttime
  }

  private fun isHex32(value: String?): Boolean =
    value != null && value.length == 32 && value.all { it in '0'..'9' || it in 'a'..'f' }

  private fun invalidIntent(): Nothing =
    throw IllegalArgumentException("account_provision_lock_control_invalid")

  companion object {
    private const val EXPECTED_PROCESS_NAME = "app.phraseman:account_v2_probe"
    private const val EXTRA_COMMAND = "account_v2_command"
    private const val EXTRA_ROLE = "account_v2_role"
    private const val EXTRA_IDENTITY = "account_v2_identity"
    private const val EXTRA_PACKAGE_NAME = "account_v2_package"
    private const val EXTRA_PROCESS_NAME = "account_v2_process"
    private const val EXTRA_PID = "account_v2_pid"
    private const val EXTRA_STARTTIME = "account_v2_starttime"
    private const val EXTRA_LAUNCH_NONCE = "account_v2_launch_nonce"
    private const val EXTRA_RUNTIME_IDENTITY = "account_v2_runtime_identity"
    private const val EXTRA_CHECKPOINT_TOKEN = "account_v2_checkpoint_token"
    private const val COMMAND_LAUNCH = "launch"
    private const val COMMAND_RELEASE = "release"
    private const val COMMAND_CHECKPOINT = "checkpoint"
    private const val ROLE_HOLDER = "holder"
    private const val ROLE_RELEASE = "release"
    private const val IDENTITY_X = "x"
    private const val IDENTITY_Y = "y"
    private const val STARTTIME_AFTER_COMM_INDEX = 19
  }
}
