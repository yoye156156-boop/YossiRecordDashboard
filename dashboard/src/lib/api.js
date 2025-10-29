export async function getRecordings() {
  const res = await fetch('/api/recordings')
  if (!res.ok) throw new Error('failed')
  return res.json()
}

// העלאה עם Progress (באמצעות XMLHttpRequest לאירועי progress)
export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error('upload failed'))
      }
    }
    xhr.onerror = () => reject(new Error('network error'))
    const fd = new FormData()
    fd.append('file', file)
    xhr.send(fd)
  })
}

export async function deleteRecording(name) {
  const res = await fetch('/api/recordings/' + encodeURIComponent(name), { method: 'DELETE' })
  if (!res.ok) throw new Error('delete failed')
  return res.json()
}
