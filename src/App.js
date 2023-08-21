import React, { Component } from "react";
import Pipeline from "@pipeline-ui-2/pipeline/index"; //change to import Pipeline from 'Pipeline for realtime editing Pipeline index.js, and dependency to: "Pipeline": "file:..",
//import steak from './steak.jpg'
import { sendTxns, configAlgosdk } from '@pipeline-ui-2/pipeline/utils'

import algosdk from 'algosdk'

var refresh = false

const myAlgoWallet = Pipeline.init();

Pipeline.main = true;

var mynet = (Pipeline.main) ? "MainNet" : "TestNet";

const tealNames = ["vaultContract"]

const tealContracts = {
  vaultContract: {},
}

const asas = {
  vHDL: 712922982,
  realHDL: 137594422
}

var asset = 0

async function getContracts() {
  for (let i = 0; i < tealNames.length; i++) {
    let name = tealNames[i]
    let data = await fetch("teal/" + name + ".txt")
    tealContracts[name].program = await data.text()
    let data2 = await fetch("teal/" + name + " clear.txt")
    tealContracts[name].clearProgram = await data2.text()
  }
}

class App extends Component {

  constructor(props) {
    super(props)
    this.state = {
      net: mynet,
      txID: "",
      myAddress: "",
      balance: 0,
      appAddress: "",
      goal: 0,
      level: 0,
      fundAmount: "Not fetched yet...",
      share: 0,
      depositAmount: 0,
      myProfits: 0,
      withdrawn: 0,
      contribution: 0,
      staked: 0,
      rewards: 0,
      stakedRound: 0,
      currentRound: 0,
      myAsaBalance: "Not fetched yet...",
      poolBalance: "Not fetched yet...",
      poolABalance: "Not fetched yet...",
      asaValue: "?",
      rate: 1,
      asa2algo: 0,
      algo2asa: 0,
      vHDL: 0,
      "Algo Astros": 0,
      "Platinum Astros": 0,
      "Forum Astros": 0,
      rHDL:0,
      vvHDL:0,
      vrHDL:0

    }
  }

  componentDidMount() {
    getContracts()
  }

  setNet = (event) => {
    if (event.target.value === "TestNet") {
      Pipeline.main = false
      this.setState({ net: "TestNet" })
    }
    else {
      Pipeline.main = true
      this.setState({ net: "MainNet" })
    }

  }

  handleConnect = () => {
    Pipeline.connect(myAlgoWallet).then(
      data => {
        this.setState({ myAddress: data });
      }
    );
  }

  switchConnector = (event) => {
    Pipeline.pipeConnector = event.target.value
    console.log(Pipeline.pipeConnector)
  }

  deploy = async () => {

    let name = "vaultContract"

    Pipeline.deployTeal(tealContracts[name].program, tealContracts[name].clearProgram, [1, 1, 10, 1], ["create"]).then(data => {
      document.getElementById("appid").value = data;
      this.setState({ appAddress: algosdk.getApplicationAddress(data) });
    })
  }

  delete = async () => {
    Pipeline.deleteApp(document.getElementById("appid").value).then(data => {
      this.setState({ txID: data })
    })
  }

  fundingLevel = async () => {
    let appId = document.getElementById("appid").value
    let appAddress = algosdk.getApplicationAddress(parseInt(appId))
    this.setState({ appAddress: appAddress })
    let balance = await Pipeline.balance(appAddress)
    this.setState({ level: ((balance / (this.state.goal / 1000000)) * 100) })
    this.setState({ fundAmount: balance })
    this.readLocalState(Pipeline.main, this.state.myAddress, appId).then(() => {
      this.readGlobal().then(() => {
        let appId = document.getElementById("appid").value
        let appAddress = algosdk.getApplicationAddress(parseInt(appId))
        this.readLocalState(Pipeline.main, appAddress, undefined, true)
      })
    })

  }

  optIn = async () => {
    let appId = document.getElementById("appid").value
    this.state.appAddress = algosdk.getApplicationAddress(parseInt(appId))
    let args = ["register"]
    Pipeline.optIn(appId, args).then(data => {
      this.setState({ txID: data });
      setInterval(() => this.fundingLevel(), 5000)
    })
  }



  clear = async () => {
    let transServer = "https://testnet-api.algonode.cloud/v2/transactions"
    if (Pipeline.main === true) { transServer = "https://mainnet-api.algonode.cloud/v2/transactions" }
    let params = await Pipeline.getParams()
    let appId = parseInt(document.getElementById("appid").value)
    let txn = algosdk.makeApplicationClearStateTxn(this.state.myAddress, params, appId)
    let signedTxn = await Pipeline.sign(txn, false)
    let txid = await sendTxns(signedTxn, transServer, false, "", true)
    this.setState({ txID: txid })
  }

  modifyTeal = () => {

    let searchTerms = [84518327, 85004101]

    let replacements = []

    Object.keys(asas).forEach(key => { replacements.push(asas[key]) })

    for (let i = 0; i < replacements.length; i++) {
      tealContracts["vaultContract"].program = tealContracts["vaultContract"].program.replaceAll(searchTerms[i], replacements[i])
      console.log(tealContracts["vaultContract"].program)
    }

    asset = parseInt(replacements[0])

    alert("Contract modified! Check console log to preview")
  }

  readGlobal = async () => {
    Pipeline.readGlobalState(document.getElementById("appid").value).then(
      data => {
        let keyIndex = ""
        for (let i = 0; i < data.length; i++) {
          let thisKey = window.atob(data[i].key)
          if (thisKey === "tokens") {
            keyIndex = i;
            let damt = data[keyIndex].value.uint
            this.setState({ globalTokens: damt })
          }
          else {
            if (thisKey === "staked") {
              keyIndex = i;
              let staked = data[keyIndex].value.uint
              this.setState({ staked: staked / 1000000 })
            }
          }
        }
      })
  }

  readLocalState = async (net, addr, appIndex, pool = false) => {

    try {

      let url = ""

      if (!net) {
        url = "https://testnet-idx.algonode.cloud"
      }
      else {
        url = "https://mainnet-idx.algonode.cloud"
      }

      let appData = await fetch(url + '/v2/accounts/' + addr)
      let appJSON = await appData.json()
      let algoBalance = appJSON.account.amount / 1000000

      if (pool) {
        this.setState({ poolABalance: algoBalance })
      }
      else {
        this.setState({ balance: algoBalance })
      }

      appJSON.account.assets.forEach(element => {
        let amount = element.amount

        if (!pool) {
          switch (element["asset-id"]) {
            case asas.vHDL:
              this.setState({ vHDL: amount })
              break;
            case asas.realHDL:
              this.setState({ rHDL: amount })
              break;
            case asas.AlgoAstro:
              this.setState({ ["Algo Astros"]: amount })
              break;
            case asas.ForumAstro:
              this.setState({ ["Forum Astros"]: amount })
              break;
            case asas.PlatAstro:
              this.setState({ ["Platinum Astros"]: amount })
              break;
            default:
              break;

          }
        }
        else{
          switch (element["asset-id"]) {
            case asas.vHDL:
              this.setState({ vvHDL: amount })
              break;
            case asas.realHDL:
              this.setState({ vrHDL: amount })
              break;
            default:
              break;
          }
        }

      })

      if (!pool) {

        let AppStates = await appJSON.account["apps-local-state"]
        AppStates.forEach(state => {
          if (state.id === parseInt(appIndex)) {
            let keyvalues = state["key-value"]
            keyvalues.forEach(entry => {
              switch (entry.key) {
                case "dG9rZW5z":
                  let myTokens = entry.value.uint / 1000000
                  this.setState({ myLiquid: myTokens })
                  break;
                case "YW10":
                  let contribution = entry.value.uint
                  this.setState({ contribution: contribution / 1000000 })
                  this.setState({ share: parseInt((contribution / (this.state.staked * 1000000)) * 100) || 0 })
                  break;
                case "d2l0aGRyYXdu":
                  let withdrawn = entry.value.uint
                  this.setState({ withdrawn: withdrawn || 0 })
                  break;
                case "cm91bmQ=":
                  let stakedRound = entry.value.uint
                  this.setState({ stakedRound: stakedRound })
                  this.setState({ redeamRound: stakedRound + 20 })
                  break;
                default:
                  break;
              }
            })
          }
        })
      }
    }
    catch (error) { console.log(error) }
  }

  startRefresh = () => {
    this.fundingLevel()
    if (!refresh) { setInterval(() => this.fundingLevel(), 5000) }
    refresh = true
  }

  commit = () => {
    let index = parseInt(document.getElementById("selector").value)
    let amount = parseInt(document.getElementById("hdlAmount").value * 1000000)
    let appId = parseInt(document.getElementById("appid").value)
    let appAddress = algosdk.getApplicationAddress(appId)

    Pipeline.appCallWithTxn(appId, ["addStuff"], appAddress, amount, "", index, [appAddress], [index]).then(data => { this.setState({ txID: data }) })

  }

  redeem = () => {
    let appId = parseInt(document.getElementById("appid").value)
    let appAddress = algosdk.getApplicationAddress(appId)

    Pipeline.appCall(appId, ["redeem"], [appAddress], [asas.realHDL]).then(data => {
      this.setState({ txID: data })
    })
  }

  ban = () => {
    let appId = document.getElementById("appid").value
    let userAddress = document.getElementById("userAddress").value

    Pipeline.appCall(appId, ["ban"], [userAddress],[]).then(data => {
      this.setState({ txID: data })
    })
  }

  addAssets = async () => {
    let appId = parseInt(document.getElementById("appid").value)
    let appAddress = algosdk.getApplicationAddress(appId)
    let keys = Object.keys(asas)

    for (let i = 0; i < 2; i++) {
      let data = await Pipeline.appCall(appId, ["addasset"], [appAddress], [parseInt(asas[keys[i]])])
      this.setState({ txID: data })
    }
  }

  fund = () => {
    let amount = parseInt(document.getElementById("fundh").value)
    let appId = parseInt(document.getElementById("appid").value)
    let appAddress = algosdk.getApplicationAddress(appId)
    Pipeline.send(appAddress, amount, "", undefined, undefined, asas.realHDL).then(data => { this.setState({ txID: data }) })
  }

  funda = () => {
    let amount = parseInt(document.getElementById("funda").value)
    let appId = parseInt(document.getElementById("appid").value)
    let appAddress = algosdk.getApplicationAddress(appId)
    Pipeline.send(appAddress, amount, "", undefined, undefined, 0).then(data => { this.setState({ txID: data }) })
  }


  render() {
    return (
      <div align="center">
        <h1>Vault</h1>
        <h2><i>An app of great utility</i></h2>
        <table className="table" width="100%">
          <tbody>
            <tr><td>

              <select onClick={this.setNet}>
                <option>TestNet</option>
                <option>MainNet</option>
              </select>
              <h2>{this.state.net}</h2>
              <select onChange={this.switchConnector}>
                <option>myAlgoWallet</option>
                <option>WalletConnect</option>
                <option>AlgoSigner</option>
              </select>

              <button onClick={this.handleConnect}>Click to Connect</button><br></br>
              <p>{"Connected Address: " + this.state.myAddress}</p>
              <p>{"Balance: " + this.state.balance + " Algos"}</p>
              <p>{"Virtual HDL Balance: " + this.state.vHDL / 1000000 + " vHDL"}</p>
              <p>{"Real HDL Balance: " + this.state.rHDL / 1000000 + " HDL"}</p>
              <p>{"Algo Astros: " + this.state["Algo Astros"] }</p>
              <p>{"Forum Astros: " + this.state["Forum Astros"] }</p>
              <p>{"Platinum Astros: " + this.state["Platinum Astros"] }</p>


              <h1>ACTIONS</h1>
              <button onClick={this.modifyTeal}>Modify Contract</button><br></br>
              <button onClick={this.deploy}>Deploy Contract</button><br></br>
              <input placeholder="App Id" id="appid" type="number"></input><br></br><br></br>
              <input placeholder="amount in micros" id="funda" type="number"></input>
              <button onClick={this.funda}>Fund Algos</button><br></br>
              <button onClick={this.addAssets}>Opt App into ASAS</button><br></br>
              <input placeholder="amount in micros" id="fundh" type="number"></input>
              <button onClick={this.fund}>Fund HDL</button><br></br>
              <button onClick={this.delete}>Delete App</button><br></br>
              <input type="text" placeholder="user address" id="userAddress"></input>
              <button onClick={this.ban}>Reduce Payout!</button>
              <h3>General User Actions</h3>
              <button onClick={this.optIn}>Opt In</button>
              <button onClick={this.clear}>Opt Out</button><br></br>
              <select id="selector">
                <option value={asas.vHDL}>vHDL</option>
              </select>
              <input id="hdlAmount" type="number"></input>
              <button onClick={this.commit}>Commit</button><br></br>
              <button onClick={this.redeem}>Grab Loot</button>
            </td>
              <td>

                <p>{"Transaction ID: " + this.state.txID}</p>
                <button onClick={this.startRefresh}>Start Refreshing</button>
                <p>{"Vault Address: " + this.state.appAddress}</p>
                <p>{"Vault Algo Balance: " + this.state.poolABalance}</p>
                <p>{"Vault vHDL Balance: " + this.state.vvHDL / 1000000}</p>
                <p>{"Vault HDL Balance: " + this.state.vrHDL / 1000000}</p>

              </td></tr>
          </tbody>
        </table>
      </div >

    );
  }
}

export default App;
