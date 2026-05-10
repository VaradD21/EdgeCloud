module.exports = {
  appId: "io.peercloud.app",
  productName: "PeerCloud",
  directories: { output: "dist" },
  files: ["dist-react/**", "electron/**", "node_modules/**"],
  win: {
    target: "nsis",
    arch: ["x64"]
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
}
