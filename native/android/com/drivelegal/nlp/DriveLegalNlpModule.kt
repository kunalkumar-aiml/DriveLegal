package com.drivelegal.nlp

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

class DriveLegalNlpModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val sessionLock = ReentrantLock()
  private var llmInference: LlmInference? = null
  private var llmSession: LlmInferenceSession? = null

  override fun getName(): String = "DriveLegalNlp"

  @ReactMethod
  fun createSession(modelPath: String, promise: Promise) {
    try {
      sessionLock.withLock {
        closeSessionLocked()

        val inferenceOptions =
          LlmInference.LlmInferenceOptions.builder()
            .setModelPath(modelPath)
            .setMaxTokens(256)
            .setTopK(40)
            .setRandomSeed(7)
            .build()

        llmInference = LlmInference.createFromOptions(reactApplicationContext, inferenceOptions)

        val sessionOptions =
          LlmInferenceSession.LlmInferenceSessionOptions.builder()
            .setTopK(1)
            .setTemperature(0.2f)
            .build()

        llmSession = LlmInferenceSession.createFromOptions(llmInference, sessionOptions)
      }

      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("DRIVELEGAL_NLP_CREATE_SESSION", error)
    }
  }

  @ReactMethod
  fun runInference(prompt: String, promise: Promise) {
    try {
      val output = sessionLock.withLock {
        val activeSession = llmSession ?: throw IllegalStateException("Session not initialized")
        activeSession.runInference(prompt)
      }

      promise.resolve(output)
    } catch (error: Exception) {
      promise.reject("DRIVELEGAL_NLP_INFERENCE", error)
    }
  }

  @ReactMethod
  fun closeSession(promise: Promise) {
    try {
      sessionLock.withLock {
        closeSessionLocked()
      }

      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("DRIVELEGAL_NLP_CLOSE_SESSION", error)
    }
  }

  private fun closeSessionLocked() {
    llmSession?.close()
    llmSession = null

    llmInference?.close()
    llmInference = null
  }

  override fun invalidate() {
    sessionLock.withLock {
      closeSessionLocked()
    }
    super.invalidate()
  }
}
