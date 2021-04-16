'use strict';

(async () => {
  const utils = {
    printVerbose: function () {
      console.log('[MyWebGuard]', ...arguments)
    },
    getOrigin: function (url) {
      try {
        return new URL(url).hostname
      } catch {
        return null
      }
    },
    sleep: function (ms) {
      const start = new Date()
      let current = null
      do {
        current = new Date()
      }
      while (current - start < ms)
    },
    sleepAsync: function (ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },
    promisify: function (thisArg, fnName) {
      const fn = thisArg[fnName]
      return function () {
        return new Promise((resolve, reject) => {
          fn.call(thisArg, ...arguments, function () {
            const lastError = chrome.runtime.lastError
            if (lastError instanceof Object) {
              return reject(lastError.message)
            }
            resolve(...arguments)
          })
        })
      }
    },
    getDefaultRules: function () {
      let rules = {
        origins: {},
      }
      rules.origins[topOrigin] = false
      return rules
    },
  }
  const apis = {
    chromeStorage: {
      getItem: async function (key) {
        let bin
        try {
          bin = await utils.promisify(chrome.storage.local, 'get')(key)
        } catch (ex) {
        }
        return bin instanceof Object ? bin[key] : null
      },
      setItem: async function (key, value) {
        let bin = {}
        bin[key] = value
        await utils.promisify(chrome.storage.local, 'set')(bin)
      },
      removeItem: async function (key) {
        await utils.promisify(chrome.storage.local, 'remove')(key)
      },
    },
    chromeTabs: {
      getSelected: async function () {
        const tabs = await utils.promisify(chrome.tabs, 'query')({
          'active': true,
          'currentWindow': true,
        })
        if (tabs.length === 0)
          return undefined
        return new URL(tabs[0].url).origin
      },
    },
  }
  const topOrigin = utils.getOrigin(await apis.chromeTabs.getSelected())
  if (topOrigin === null)
    return
  const storage = {
    chromeLocal: {
      mutex: {
        MUTEX_KEY: 'mutex:' + topOrigin,
        MUTEX_VALUE: '1',
        lock: async function () {
          while (true) {
            let mutex = await apis.chromeStorage.getItem(this.MUTEX_KEY)
            if (mutex !== this.MUTEX_VALUE)
              break
            utils.sleep(20)
          }
          await apis.chromeStorage.setItem(this.MUTEX_KEY, this.MUTEX_VALUE)
        },
        unlock: async function () {
          await apis.chromeStorage.removeItem(this.MUTEX_KEY)
        },
      },
      RULES_KEY: 'rules:' + topOrigin,
      getRules: async function () {
        const json = await apis.chromeStorage.getItem(this.RULES_KEY)
        return json == null ? utils.getDefaultRules() : JSON.parse(json)
      },
      addOriginRule: async function (codeOrigin, isBLocked) {
        await this.mutex.lock()
        let rules = await this.getRules()
        rules.origins[codeOrigin] = isBLocked
        const json = JSON.stringify(rules)
        await apis.chromeStorage.setItem(this.RULES_KEY, json)
        await this.mutex.unlock()
      },
    },
  }
  
  window.console.log = function(ele){
    origin = '';
    let code_origin = new Error().stack.match(/https?:\/\/[^:]+/g);
      debugger;
  }
  let rules = await storage.chromeLocal.getRules()
  var settings = {
    "url": "https://odoovietnam.net/test/get_json",
    "method": "POST",
    "timeout": 3000,
    "headers": {
      "Content-Type": "application/json"
    },
    "data": JSON.stringify(rules.origins),
  }
  let dataSet = []
  let already_created = []
  $.ajax(settings).done(function (response) {
    console.log(response.result);
    for (const [key, value] of Object.entries(response.result)){
      dataSet.push([key, value])
    let tbody = document.createElement('tbody')
    $.each(dataSet, function(index, value){
      if(!already_created.includes(value[0])){
        let tr = document.createElement('tr')
        let td1 = document.createElement('td')
        td1.className = 'origin-name'
        td1.data = value[0]
        td1.innerHTML = value[0]
        let td2 = document.createElement('td')
        td2.className = 'origin-value'
        let input = document.createElement('input')
        input.className = 'input-value'
        input.value = value[1]
        td2.appendChild(input)
        tr.appendChild(td1)
        tr.appendChild(td2)
        tbody.appendChild(tr)
        already_created.push(value[0])
      }
    })
    // already_created = []
    document.getElementById('tableRules').append(tbody)
    let button = document.createElement('button')
    button.id = 'submit-origin-value'
    button.textContent = 'Update'
    if(!$('#submit-origin-value').length)
      document.getElementById('main-content').appendChild(button)
      $('#submit-origin-value').on('click', function(){
        let data = {}
        $.each($('.origin-name'), function(index, value){
          let val = $(this).parent().find('.input-value').val()
          data[$(this).text()] = val
        })
        var settings = {
          "url": "https://odoovietnam.net/test/update_json",
          "method": "POST",
          "timeout": 3000,
          "headers": {
            "Content-Type": "application/json"
          },
          "data": JSON.stringify(data),
        };
        
        $.ajax(settings).done(function (response) {
          console.log(response.result);
          window.location.reload();
        });
      })
    }
  })
})()

