<?php
/**
 * Plugin Name:       AquaThrust Water Rocket Simulator
 * Description:       Interactive 3D water rocket simulator. Add it to any page or post with the shortcode [aquathrust].
 * Version:           1.7.1
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            AquaThrust
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       aquathrust
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'AQUATHRUST_VERSION', '1.7.1' );
define( 'AQUATHRUST_URL', plugin_dir_url( __FILE__ ) );
define( 'AQUATHRUST_ASSETS_PATH', basename( __DIR__ ) . '/assets/' );

/**
 * Shortcode: [aquathrust preset="classic" height="620px" lang="es"]
 *
 * preset: classic | beginner | tube | highpressure | longtube | mountain
 * height: height of the 3D view (any CSS length), default 600px
 * lang:   en | es | auto (default auto: visitor's last choice, else browser language;
 *         visitors can always switch with the EN/ES buttons)
 */
function aquathrust_shortcode( $atts ) {
	static $script_printed = false;

	$atts = shortcode_atts(
		array(
			'preset' => 'classic',
			'height' => '600px',
			'lang'   => 'auto',
		),
		$atts,
		'aquathrust'
	);

	$preset = preg_replace( '/[^a-z0-9_-]/i', '', $atts['preset'] );
	$lang   = in_array( $atts['lang'], array( 'en', 'es' ), true ) ? $atts['lang'] : '';
	$height = preg_match( '/^\d+(\.\d+)?(px|vh|em|rem|%)$/', $atts['height'] ) ? $atts['height'] : '600px';

	$html = sprintf(
		'<div class="aquathrust-embed" data-aquathrust data-preset="%s" data-height="%s" data-lang="%s" style="margin:1.5em 0;max-width:100%%;"></div>',
		esc_attr( $preset ),
		esc_attr( $height ),
		esc_attr( $lang )
	);

	$src = AQUATHRUST_URL . 'assets/js/main.js';

	if ( function_exists( 'wp_enqueue_script_module' ) ) {
		// WordPress 6.5+: native ES module support.
		wp_enqueue_script_module( 'aquathrust', $src, array(), AQUATHRUST_VERSION );
	} elseif ( ! $script_printed ) {
		// Older WordPress: print the module tag once, right after the first embed.
		$html          .= '<script type="module" src="' . esc_url( $src . '?ver=' . AQUATHRUST_VERSION ) . '"></script>';
		$script_printed = true;
	}

	return $html;
}
add_shortcode( 'aquathrust', 'aquathrust_shortcode' );

/**
 * Keep performance / minification plugins from rewriting the ES modules
 * (they must stay as separate files with relative imports).
 */
function aquathrust_exclude_from_optimizers( $excluded ) {
	if ( is_array( $excluded ) ) {
		$excluded[] = 'aquathrust';
		$excluded[] = AQUATHRUST_ASSETS_PATH;
	}
	return $excluded;
}
add_filter( 'autoptimize_filter_js_exclude', function ( $list ) {
	return $list . ', ' . AQUATHRUST_ASSETS_PATH;
} );
add_filter( 'rocket_exclude_js', 'aquathrust_exclude_from_optimizers' );
add_filter( 'rocket_exclude_defer_js', 'aquathrust_exclude_from_optimizers' );
add_filter( 'rocket_delay_js_exclusions', 'aquathrust_exclude_from_optimizers' );
add_filter( 'litespeed_optimize_js_excludes', 'aquathrust_exclude_from_optimizers' );
add_filter( 'sgo_js_minify_exclude', 'aquathrust_exclude_from_optimizers' );
