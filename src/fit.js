import Xterm from 'xterm'

/**
 * 根据 term 相关属性获取整个内容区域宽高，除以单个字符所占用的宽高，获得 cols 与 rows
 * @param  {[Object]} term [Xterm 实例]
 * @return {[Object]} geometry [{ cols: [Number], rows: [Number] }]
 */
const proposeGeometry = (term) => {
  const parentElement = term.element.parentElement

  if (!parentElement) {
    return null
  }

  let cols = 80
  let rows = 24
  let characterHeight = 0
  let characterWidth = 0
  let geometry = { cols, rows }

  const elementStyle = window.getComputedStyle(term.element)
  const elementPaddingVertical = parseInt(elementStyle.getPropertyValue('padding-top'), 10) + parseInt(elementStyle.getPropertyValue('padding-bottom'), 10)
  const elementPaddingHorizontal = parseInt(elementStyle.getPropertyValue('padding-right'), 10) + parseInt(elementStyle.getPropertyValue('padding-left'), 10)
  const availableHeight = parseInt((parentElement.clientHeight - elementPaddingVertical), 10)
  const availableWidth = parseInt((parentElement.clientWidth - elementPaddingHorizontal - 15), 10)

  const container = term.rowContainer
  const subjectRow = term.rowContainer.firstElementChild
  const contentBuffer = subjectRow.innerHTML

  subjectRow.style.display = 'inline'
  subjectRow.innerHTML = 'W' // 输入单个字符计算宽度
  characterWidth = subjectRow.getBoundingClientRect().width
  subjectRow.style.display = '' // 计算高度前恢复 display
  characterHeight = subjectRow.getBoundingClientRect().height
  subjectRow.innerHTML = contentBuffer

  rows = parseInt((availableHeight / characterHeight), 10)
  cols = parseInt((availableWidth / characterWidth), 10)

  geometry = { cols, rows }

  return geometry
}

/**
 * 调用 xterm 实例的 resize 方法重设 cols, rows
 * @param  {[Object]} term [Xterm 实例]
 */
const fit = (term) => {
  const geometry = proposeGeometry(term)

  if (geometry) {
    term.resize(geometry.cols, geometry.rows)
  }
}

Xterm.prototype.proposeGeometry = function () {
  return proposeGeometry(this)
}
Xterm.prototype.fit = function () {
  return fit(this)
}

export default { fit, proposeGeometry }
