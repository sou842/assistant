"use client";
import { useRef, useEffect, useCallback, FC, ReactNode } from "react";

interface ClickSparkProps {
    sparkColor?: string;
    sparkSize?: number;
    sparkRadius?: number;
    sparkCount?: number;
    duration?: number;
    easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
    extraScale?: number;
    children?: ReactNode;
    bindToWindow?: boolean;
}

interface Spark {
    x: number;
    y: number;
    angle: number;
    startTime: number;
}

const ClickSpark: FC<ClickSparkProps> = ({
    sparkColor = "#fff",
    sparkSize = 10,
    sparkRadius = 15,
    sparkCount = 8,
    duration = 400,
    easing = "ease-out",
    extraScale = 1.0,
    children,
    bindToWindow = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sparksRef = useRef<Spark[]>([]);
    const startTimeRef = useRef<number | null>(null);
    const animationIdRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const parent = canvas.parentElement;
        if (!parent) return;

        let resizeTimeout: NodeJS.Timeout;

        const resizeCanvas = () => {
            const { width, height } = parent.getBoundingClientRect();
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
        };

        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeCanvas, 100);
        };

        const ro = new ResizeObserver(handleResize);
        ro.observe(parent);

        resizeCanvas();

        return () => {
            ro.disconnect();
            clearTimeout(resizeTimeout);
        };
    }, []);


    const easeFunc = useCallback(
        (t: number) => {
            switch (easing) {
                case "linear":
                    return t;
                case "ease-in":
                    return t * t;
                case "ease-in-out":
                    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                default:
                    return t * (2 - t);
            }
        },
        [easing]
    );

    const propsRef = useRef({ sparkColor, sparkSize, sparkRadius, duration, easeFunc, extraScale });

    useEffect(() => {
        propsRef.current = { sparkColor, sparkSize, sparkRadius, duration, easeFunc, extraScale };
    }, [sparkColor, sparkSize, sparkRadius, duration, easeFunc, extraScale]);

    const draw = useCallback((timestamp: number) => {
        if (!startTimeRef.current) {
            startTimeRef.current = timestamp;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const { sparkColor, sparkSize, sparkRadius, duration, easeFunc, extraScale } = propsRef.current;

        sparksRef.current = sparksRef.current.filter((spark: Spark) => {
            const elapsed = timestamp - spark.startTime;
            if (elapsed >= duration) {
                return false;
            }

            const progress = elapsed / duration;
            const eased = easeFunc(progress);

            const distance = eased * sparkRadius * extraScale;
            const lineLength = sparkSize * (1 - eased);

            const x1 = spark.x + distance * Math.cos(spark.angle);
            const y1 = spark.y + distance * Math.sin(spark.angle);
            const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
            const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

            ctx.strokeStyle = sparkColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            return true;
        });

        if (sparksRef.current.length > 0) {
            animationIdRef.current = requestAnimationFrame(draw);
        } else {
            animationIdRef.current = null;
        }
    }, []);

    const handleClick = useCallback((e: MouseEvent): void => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const now = performance.now();
        const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
            x,
            y,
            angle: (2 * Math.PI * i) / sparkCount,
            startTime: now,
        }));

        sparksRef.current.push(...newSparks);

        if (animationIdRef.current === null) {
            animationIdRef.current = requestAnimationFrame(draw);
        }
    }, [sparkCount, draw]);

    useEffect(() => {
        if (!bindToWindow) return;
        const handleWindowClick = (e: MouseEvent) => {
            handleClick(e);
        };
        window.addEventListener("click", handleWindowClick);
        return () => window.removeEventListener("click", handleWindowClick);
    }, [bindToWindow, handleClick]);

    return (
        <div style={{
            width: "100%",
            height: "100%",
            position: bindToWindow ? "fixed" : "relative",
            inset: bindToWindow ? 0 : undefined,
            pointerEvents: bindToWindow ? "none" : "auto"
        }}
            onClick={bindToWindow ? undefined : (e) => handleClick(e.nativeEvent)}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 50 // Ensures sparks appear above normal content
                }}
            />
            {children}
        </div>
    );
};

export default ClickSpark;
