import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { WebView, type ShouldStartLoadRequest } from 'react-native-webview';
import { SiteContent } from '../../data/siteContent';
import {
  buildSitePreviewHtml,
  buildSitePreviewInjection,
  DEFAULT_PREVIEW_THEME,
  getSitePreviewPageUrl,
  STYLD_PREVIEW_INTERACTIONS_SCRIPT,
  SitePreviewReview,
  SitePreviewStyle,
  SitePreviewTheme,
} from '../../lib/sitePreviewHtml';

type SitePreviewWebViewProps = {
  content: SiteContent;
  styles?: SitePreviewStyle[];
  theme?: SitePreviewTheme;
  compact?: boolean;
  reviews?: SitePreviewReview[];
  reviewsEnabled?: boolean;
};

const APPLY_PREVIEW_SCRIPT =
  'if(window.applyStyldPreviewContent){window.applyStyldPreviewContent();}true;';

const PREVIEW_INTERACTIONS_INJECT = `${STYLD_PREVIEW_INTERACTIONS_SCRIPT}true;`;

function shouldAllowPreviewNavigation(req: ShouldStartLoadRequest): boolean {
  if (req.navigationType === 'click') return false;
  return req.navigationType === 'other' || req.url === req.mainDocumentURL;
}

export default function SitePreviewWebView({
  content,
  styles: previewStyles = [],
  theme = DEFAULT_PREVIEW_THEME,
  compact,
  reviews = [],
  reviewsEnabled = true,
}: SitePreviewWebViewProps) {
  const webRef = useRef<WebView>(null);
  const hostedUrl = getSitePreviewPageUrl();
  const useHostedPreview =
    Boolean(hostedUrl) && theme.templateId !== 'profile' && theme.heroLayout !== 'cover';
  const resolvedTheme = useMemo(
    () => ({ ...theme, embeddedPreview: compact === true }),
    [theme, compact],
  );
  const previewContext = useMemo(
    () => ({ reviews, reviewsEnabled }),
    [reviews, reviewsEnabled],
  );
  const html = useMemo(
    () => buildSitePreviewHtml(content, previewStyles, resolvedTheme, previewContext),
    [content, previewStyles, resolvedTheme, previewContext],
  );
  const injection = useMemo(
    () =>
      `${buildSitePreviewInjection(content, previewStyles, resolvedTheme, previewContext)}${APPLY_PREVIEW_SCRIPT}`,
    [content, previewStyles, resolvedTheme, previewContext],
  );

  const blockPreviewLinkNavigation = useCallback((req: ShouldStartLoadRequest) => {
    return shouldAllowPreviewNavigation(req);
  }, []);

  const handleLoadEnd = useCallback(() => {
    if (resolvedTheme.zoomedOut && resolvedTheme.embeddedPreview) {
      webRef.current?.injectJavaScript(
        'if(window.fitEmbeddedDesktopPreview){window.fitEmbeddedDesktopPreview();}true;',
      );
    }
    if (resolvedTheme.heroLayout !== 'cover') return;
    if (resolvedTheme.coverPreviewOnBookPage) {
      webRef.current?.injectJavaScript('window.scrollTo(0,0);true;');
      return;
    }
    webRef.current?.injectJavaScript(
      'if(window.fitCoverPreview){window.fitCoverPreview();}true;',
    );
  }, [
    resolvedTheme.heroLayout,
    resolvedTheme.coverPreviewOnBookPage,
    resolvedTheme.zoomedOut,
    resolvedTheme.embeddedPreview,
  ]);

  useEffect(() => {
    if (!useHostedPreview) return;
    webRef.current?.injectJavaScript(injection);
  }, [useHostedPreview, injection]);

  const webViewKey = useMemo(
    () =>
      [
        resolvedTheme.heroLayout ?? 'banner',
        resolvedTheme.heroPhotoEnabled === false ? '0' : '1',
        resolvedTheme.heroCoverBlur ? '1' : '0',
        resolvedTheme.coverPreviewOnBookPage ? '1' : '0',
        String(resolvedTheme.heroStackImageUrls?.length ?? 0),
        html.length,
      ].join('|'),
    [resolvedTheme, html.length],
  );

  return (
    <View style={[sheetStyles.wrap, compact && sheetStyles.wrapCompact]}>
      <WebView
        key={webViewKey}
        ref={webRef}
        source={useHostedPreview ? { uri: hostedUrl! } : { html }}
        injectedJavaScriptBeforeContentLoaded={useHostedPreview ? injection : undefined}
        injectedJavaScript={PREVIEW_INTERACTIONS_INJECT}
        style={sheetStyles.webview}
        scrollEnabled
        showsVerticalScrollIndicator={!compact}
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        startInLoadingState
        onShouldStartLoadWithRequest={blockPreviewLinkNavigation}
        onLoadEnd={handleLoadEnd}
        {...(Platform.OS === 'android'
          ? { onShouldOverrideUrlLoading: blockPreviewLinkNavigation }
          : {})}
        renderLoading={() => (
          <View style={sheetStyles.loading}>
            <ActivityIndicator color="#db2777" />
          </View>
        )}
      />
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  wrapCompact: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
});
