<script>
export default {
  onLaunch: function() {
    console.log('App Launch')
    
    // ✅ 条件编译必须写在 script 逻辑内部，或者作为注释存在
    // #ifdef MP-WEIXIN
    console.log('当前运行在微信小程序环境')
    // #endif
    
    // #ifdef H5
    console.log('当前运行在 H5 环境')
    // #endif
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  }
}
</script>

<style>
/* 全局样式 */
page {
  background-color: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 通用重置 */
view, text, scroll-view, image {
  box-sizing: border-box;
}
</style>