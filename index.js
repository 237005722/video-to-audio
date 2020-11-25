/***
 * video-to-audio
 * creater：qc
 * reference：//github.com/mdn/webaudio-examples/tree/master/offline-audio-context-promise
*/
const videoToAudio = async(file) => {
  try {
    console.log('videoToAudio file', file)
    const fileData = new Blob([file]) // video file
    
    const arrayBuffer = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = ()=> {
        const arrayBuffer = reader.result
        resolve(arrayBuffer)
      }
      reader.readAsArrayBuffer(fileData)
    })
    console.log('arrayBuffer', arrayBuffer)
    
    const audioContext = new(window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext)()
    const decodedAudioData = await audioContext.decodeAudioData(arrayBuffer)
    console.log('decodedAudioData', decodedAudioData)
    const fileDuration = durationTrans(decodedAudioData.duration)
    console.log('fileDuration', fileDuration)

    const offlineAudioContext = new OfflineAudioContext(decodedAudioData.numberOfChannels, decodedAudioData.sampleRate * decodedAudioData.duration, decodedAudioData.sampleRate)
    const soundSource = offlineAudioContext.createBufferSource()
    soundSource.buffer = decodedAudioData
    soundSource.connect(offlineAudioContext.destination)
    soundSource.start()

    const renderedBuffer = await offlineAudioContext.startRendering()
    console.log('renderedBuffer', renderedBuffer) // outputs audiobuffer
    const wav = audioBufferToWav(renderedBuffer)
    
    const fileType = `wav`
    const fileName = `${file.name}.${fileType}`
    downloadWav(wav, fileName)
    return { fileName, fileType, fileDuration }
  } catch (error) {
    // {code: 0, name: 'EncodingError', message: 'Unable to decode audio data'} Case：No audio in the video file ? Maybe
    console.log('videoToAudio error', error)
    return null
  } finally {
    console.log('videoToAudio finally')
  }
}
const downloadWav = (wav, fileName = 'audio.wav') => {
  try {
    const blob = new window.Blob([ new DataView(wav) ], {
      type: 'audio/wav'
    })
    if ('download' in document.createElement('a')) {
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      document.body.appendChild(anchor)
      anchor.style = 'display: none'
      anchor.href = url
      anchor.download = fileName
      anchor.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(anchor)
    } else {
      navigator.msSaveBlob(blob, fileName)
    }
  } catch (error) {
    console.log('downloadWav error', error)
  } finally {
    console.log('downloadWav finally')
  }
}
const durationTrans = (a) => {
  let b = ''
  let h = parseInt(a/3600),
      m = parseInt(a%3600/60),
      s = parseInt(a%3600%60)
  if (h > 0) {
    h = h < 10 ? '0' + h : h
    b += h + ':'
  }
  m = m < 10 ? '0' + m : m 
  s = s < 10 ? '0' + s : s 
  b += m + ":" + s
  return b
}

/**
 * audiobuffer-to-wav
 * creater：https://github.com/Jam3/audiobuffer-to-wav
*/
const audioBufferToWav = (buffer, opt) => {
  opt = opt || {}

  var numChannels = buffer.numberOfChannels
  var sampleRate = buffer.sampleRate
  var format = opt.float32 ? 3 : 1
  var bitDepth = format === 3 ? 32 : 16

  var result
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1))
  } else {
    result = buffer.getChannelData(0)
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth)
}
const encodeWAV = (samples, format, sampleRate, numChannels, bitDepth) => {
  var bytesPerSample = bitDepth / 8
  var blockAlign = numChannels * bytesPerSample

  var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  var view = new DataView(buffer)

  /* RIFF identifier */
  writeString(view, 0, 'RIFF')
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  /* RIFF type */
  writeString(view, 8, 'WAVE')
  /* format chunk identifier */
  writeString(view, 12, 'fmt ')
  /* format chunk length */
  view.setUint32(16, 16, true)
  /* sample format (raw) */
  view.setUint16(20, format, true)
  /* channel count */
  view.setUint16(22, numChannels, true)
  /* sample rate */
  view.setUint32(24, sampleRate, true)
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true)
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true)
  /* bits per sample */
  view.setUint16(34, bitDepth, true)
  /* data chunk identifier */
  writeString(view, 36, 'data')
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true)
  if (format === 1) { // Raw PCM
    floatTo16BitPCM(view, 44, samples)
  } else {
    writeFloat32(view, 44, samples)
  }
  return buffer
}
const interleave = (inputL, inputR) => {
  var length = inputL.length + inputR.length
  var result = new Float32Array(length)
  var index = 0
  var inputIndex = 0
  while (index < length) {
    result[index++] = inputL[inputIndex]
    result[index++] = inputR[inputIndex]
    inputIndex++
  }
  return result
}
const writeFloat32 = (output, offset, input) => {
  for (var i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true)
  }
}
const floatTo16BitPCM = (output, offset, input) =>{
  for (var i = 0; i < input.length; i++, offset += 2) {
    var s = Math.max(-1, Math.min(1, input[i]))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
}
const writeString = (view, offset, string) => {
  for (var i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
