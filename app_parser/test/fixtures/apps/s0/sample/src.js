var fn1

fn1 = function () {
  'directive'
  'one more directive'

  for (let i = 0, l = 10; i < l; i++) {
    if (i % 2 === 0) {
      continue
    }
    else if (i % 3 === 0) {
      debugger
      break
    }
    else {
      console.log('bye')
    }
  }

  let i = 3
  do {
    a(i--)
  } while (i > 0)

  function a(d = () => ({})) {
    b()
    // console.log('hi')
    return function hello(param1, param2) {
    }
  }

  var b = function name(par1, par2 = true) {
    console.log('hello')
    return () => {
    }
  }

  const c = () => ({})

  ;(function () {
    return '123'
  })()
}

function fn3(param) {
  var var1 = 123
  return var1 + param
}

function fn5(arr) {
  var arrCopy = []
  for (var i = 0, l = arr.length; i < l; i++) {
    arrCopy[i] = fn3(arr[i])
  }
}

function fn6() {
  function helperFn(i) {
    return i + 1
  }

  var arr = []

  for (var i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      arr.push(i)
    } else {
      arr.push(helperFn(i))
    }
  }

  return arr
}

function fn7() {
  var arr = []
  var i = 0
  while (i < 100) {
    arr.push(i++)
  }
  return arr
}
