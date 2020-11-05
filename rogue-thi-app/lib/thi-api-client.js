import { thiApiRequest } from './thi-api-request'
import NodeCache from 'node-cache'

const CACHE_TTL = 600
const CACHE_CHECK = 300

const KEY_GET_PERSONAL_DATA = 'getPersonalData'
const KEY_GET_TIMETABLE = 'getTimetable'
const KEY_GET_EXAMS = 'getExams'
const KEY_GET_GRADES = 'getGrades'
const KEY_GET_MENSA_PLAN = 'getMensaPlan'

const cache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: CACHE_CHECK
})

export async function obtainSession (router) {
  let session = localStorage.session
  const age = parseInt(localStorage.sessionCreated)
  const username = localStorage.username
  const password = localStorage.password

  console.log(age, session && age && age + 3 * 60 * 60 * 1000 < Date.now())

  if (session && age && age + 3 * 60 * 60 * 1000 < Date.now()) {
    if (!await isAlive(session)) {
      session = false
    }
  }

  if (!session && username && password) {
    try {
      session = await login(username, password)
      localStorage.session = session
      localStorage.sessionCreated = Date.now()
    } catch (e) {
      router.push('/login')
      throw e
    }
  }

  if (!session) {
    router.push('/login')
  }

  return session
}

export async function login (username, password) {
  cache.flushAll()

  const res = await thiApiRequest({
    service: 'session',
    method: 'open',
    format: 'json',
    username: username,
    passwd: password
  })

  if (res.status !== 0) {
    throw res.data
  } // e.g. 'Wrong credentials'

  return res.data[0]
}

export async function isAlive (session) {
  const res = await thiApiRequest({
    service: 'session',
    method: 'isalive',
    format: 'json',
    session
  })

  return res.data === 'STATUS_OK'
}

export async function getPersonalData (session) {
  let res = cache.get(KEY_GET_PERSONAL_DATA)
  if (!res) {
    res = await thiApiRequest({
      service: 'thiapp',
      method: 'persdata',
      format: 'json',
      session
    })
  }

  if (res.status !== 0) {
    throw res.data
  } // e.g. 'Wrong credentials'

  cache.set(KEY_GET_PERSONAL_DATA, res)

  return res.data[1]
}

export async function getTimetable (session, date) {
  let res = cache.get(KEY_GET_TIMETABLE)
  if (!res) {
    res = await thiApiRequest({
      service: 'thiapp',
      method: 'stpl',
      format: 'json',
      session,
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: 1900 + date.getYear(),
      details: 0
    })
  }

  if (res.status !== 0) {
    throw res.data
  } // e.g. 'Wrong credentials'

  cache.set(KEY_GET_TIMETABLE, res)

  return {
    semester: res.data[1],
    holidays: res.data[2],
    events: res.data[2],
    timetable: res.data[3]
  }
}

export async function getExams (session) {
  let res = cache.get(KEY_GET_EXAMS)
  if (!res) {
    res = await thiApiRequest({
      service: 'thiapp',
      method: 'exams',
      format: 'json',
      session
    })
  }

  if (res.status !== 0) {
    throw res.data
  } // e.g. 'Wrong credentials'

  cache.set(KEY_GET_EXAMS, res)

  return res.data[1]
}

export async function getGrades (session) {
  let res = cache.get(KEY_GET_GRADES)
  if (!res) {
    res = await thiApiRequest({
      service: 'thiapp',
      method: 'grades',
      format: 'json',
      session
    })
  }

  if (res.status !== 0) {
    throw res.data
  } // e.g. 'Wrong credentials'

  cache.set(KEY_GET_GRADES, res)

  return res.data[1]
}

export async function getMensaPlan (session) {
  let res = cache.get(KEY_GET_MENSA_PLAN)
  if (!res) {
    res = await thiApiRequest({
      service: 'thiapp',
      method: 'mensa',
      format: 'json',
      session
    })
  }

  if (res.status !== 0) {
    throw res.data
  } // e.g. 'Wrong credentials'

  cache.set(KEY_GET_MENSA_PLAN, res)

  return res.data[0]
}

export async function getLibraryReservations (session) {
  const res = await thiApiRequest({
    service: 'thiapp',
    method: 'reservations',
    type: 1,
    subtype: 1,
    cmd: 'getreservation',
    data: '',
    format: 'json',
    session
  })

  if (res.data === 'No reservation data') {
    return []
  }
  if (res.status !== 0) {
    throw res.data
  } // e.g. 'Wrong credentials'

  return res.data[1]
}

export async function getAvailableLibrarySeats (session) {
  const res = await thiApiRequest({
    service: 'thiapp',
    method: 'reservations',
    type: 1,
    subtype: 1,
    cmd: 'getavailabilities',
    data: '',
    format: 'json',
    session
  })

  if (res.status !== 0) {
    throw res.data
  } // e.g. 'Wrong credentials'

  return res.data[1]
}

export async function addLibraryReservation (session, roomId, day, start, end, place) {
  const res = await thiApiRequest({
    service: 'thiapp',
    method: 'reservations',
    type: 1,
    subtype: 1,
    cmd: 'addreservation',
    data: JSON.stringify({
      resource: roomId,
      at: day,
      from: start,
      to: end,
      place,
    }),
    format: 'json',
    session
  })

  if (res.status !== 0) {
    throw res.data
  } // e.g. 'Wrong credentials'

  return res.data[1][0]
}

export async function removeLibraryReservation (session, reservationId) {
  const res = await thiApiRequest({
    service: 'thiapp',
    method: 'reservations',
    type: 1,
    subtype: 1,
    cmd: 'delreservation',
    data: reservationId,
    format: 'json',
    session
  })

  if (res.data === 'No reservation data') {
    return true // dafuq THI API?
  }
  if (res.status !== 0) {
    throw res.data
  } // e.g. 'Wrong credentials'

  return true
}
