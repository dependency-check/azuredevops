import TerserPlugin from "terser-webpack-plugin";

module.exports = {
  target: 'node',
  node: {
    __dirname: false,
    __filename: false
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  }
};